import { createBoard, type BoardDefinition } from "./board";
import { playCard, type CardChoice } from "./cardPlay";
import { STARTING_HAND, STARTING_KI, standardDeck, type CardId } from "./cards";
import { GameRuleError, type GameCommand } from "./commands";
import { buildDeck } from "./deck";
import type { DiceRoller } from "./dice";
import { playerIn, startDraft, updatePlayer, walkPath, type Draft } from "./draft";
import type { GameEvent } from "./events";
import { resolveLanding } from "./landing";
import type { RandomSource } from "./random";
import { endTurn } from "./turn";
import type { GameState, Player, PlayerId } from "./types";

export interface NewPlayer {
  id: PlayerId;
  name: string;
}

export interface GameDependencies {
  rollDice: DiceRoller;
  /** Shuffles decks (on restart); injected like the dice so games replay exactly. */
  random: RandomSource;
}

export interface GameTransition {
  state: GameState;
  events: GameEvent[];
}

export interface GameOptions {
  random?: RandomSource;
  /** Each player's card list; defaults to the standard deck. Collections will fill this in. */
  decks?: Readonly<Record<PlayerId, readonly CardId[]>>;
}

export function createGame(board: BoardDefinition, players: readonly NewPlayer[], options: GameOptions = {}): GameState {
  if (players.length === 0) throw new Error("A game needs at least one player");

  const createdBoard = createBoard(board);
  const decks = Object.fromEntries(
    players.map((player) => [
      player.id,
      options.decks?.[player.id] ?? standardDeck({ withOpponents: players.length > 1 }),
    ]),
  );
  return {
    board: createdBoard,
    players: players.map((player) => dealPlayer(player, createdBoard.startTile, decks[player.id], options.random)),
    decks,
    currentPlayerIndex: 0,
    status: "playing",
    winnerId: null,
    turn: 1,
    cardPlayedThisTurn: false,
    bonusTurn: false,
    pendingDiscard: null,
  };
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

/** Pure reducer: same state + same dice and shuffles = same result, on the client or on a server. */
export function applyCommand(state: GameState, command: GameCommand, deps: GameDependencies): GameTransition {
  switch (command.type) {
    case "rollDice":
      return rollDice(state, command.playerId, deps);
    case "playCard":
      return playCardCommand(state, command.playerId, command.cardUid, command);
    case "discardCard":
      return discardCard(state, command.playerId, command.cardUid);
    case "restart":
      return restart(state, deps);
  }
}

function rollDice(state: GameState, playerId: PlayerId, deps: GameDependencies): GameTransition {
  assertCanAct(state, playerId);
  const draft = startDraft(state);
  const player = playerIn(draft, playerId);

  const boost = player.diceBoost;
  const dice =
    boost?.kind === "fixed" ? [boost.value] : boost?.kind === "double" ? [deps.rollDice(), deps.rollDice()] : [deps.rollDice()];
  const value = dice.reduce((sum, die) => sum + die, 0);
  updatePlayer(draft, playerId, () => ({ diceBoost: null }));

  const path = walkPath(player.position, value, state.board.finishTile);
  draft.events.push({ type: "diceRolled", playerId, value, dice }, { type: "playerMoved", playerId, path });
  resolveLanding(draft, playerId, path.at(-1) ?? player.position);

  const extraTurn = draft.extraTurn || state.bonusTurn;
  return settle(draft, playerId, { endsTurn: true, extraTurn });
}

function playCardCommand(state: GameState, playerId: PlayerId, cardUid: string, choice: CardChoice): GameTransition {
  assertCanAct(state, playerId);
  const draft = startDraft(state);
  playCard(draft, playerId, cardUid, choice);

  const settled = settle(draft, playerId, { endsTurn: false, extraTurn: false });
  const bonusTurn = state.bonusTurn || draft.extraTurn;
  return { ...settled, state: { ...settled.state, cardPlayedThisTurn: true, bonusTurn } };
}

function discardCard(state: GameState, playerId: PlayerId, cardUid: string): GameTransition {
  if (state.status === "finished") throw new GameRuleError("GAME_FINISHED");
  const pending = state.pendingDiscard;
  if (!pending) throw new GameRuleError("NO_DISCARD_PENDING");
  if (pending.playerId !== playerId) throw new GameRuleError("NOT_YOUR_TURN");

  const draft = startDraft({ ...state, pendingDiscard: null });
  const candidates = [...playerIn(draft, playerId).hand, pending.drawn];
  const card = candidates.find((candidate) => candidate.uid === cardUid);
  if (!card) throw new GameRuleError("UNKNOWN_CARD");

  const hand = candidates.filter((candidate) => candidate.uid !== cardUid);
  updatePlayer(draft, playerId, () => ({ hand }));
  draft.events.push({ type: "cardDiscarded", playerId, card, hand });
  return settle(draft, playerId, { endsTurn: pending.endsTurn, extraTurn: pending.extraTurn });
}

/**
 * Turns a draft into the next state: a win ends the game, an overflowing draw pauses for a
 * discard, and otherwise the turn ends if the command ends it.
 */
function settle(
  draft: Draft,
  playerId: PlayerId,
  { endsTurn, extraTurn }: { endsTurn: boolean; extraTurn: boolean },
): GameTransition {
  const { state } = draft;

  if (playerIn(draft, playerId).position === state.board.finishTile) {
    draft.events.push({ type: "playerWon", playerId });
    return {
      state: { ...state, players: draft.players, status: "finished", winnerId: playerId, pendingDiscard: null },
      events: draft.events,
    };
  }

  if (draft.overflow) {
    const pendingDiscard = { playerId, drawn: draft.overflow, endsTurn, extraTurn };
    return { state: { ...state, players: draft.players, pendingDiscard }, events: draft.events };
  }

  if (!endsTurn) return { state: { ...state, players: draft.players }, events: draft.events };

  const currentPlayerIndex = endTurn(draft, extraTurn);
  return {
    state: {
      ...state,
      players: draft.players,
      currentPlayerIndex,
      turn: state.turn + 1,
      cardPlayedThisTurn: false,
      bonusTurn: false,
    },
    events: draft.events,
  };
}

function restart(state: GameState, deps: GameDependencies): GameTransition {
  const players = state.players.map((player) =>
    dealPlayer(player, state.board.startTile, state.decks[player.id], deps.random),
  );
  return {
    state: {
      ...state,
      players,
      currentPlayerIndex: 0,
      status: "playing",
      winnerId: null,
      turn: 1,
      cardPlayedThisTurn: false,
      bonusTurn: false,
      pendingDiscard: null,
    },
    events: [{ type: "gameRestarted" }, { type: "turnChanged", playerId: players[0].id }],
  };
}

function assertCanAct(state: GameState, playerId: PlayerId): void {
  if (state.status === "finished") throw new GameRuleError("GAME_FINISHED");
  if (!state.players.some((player) => player.id === playerId)) throw new GameRuleError("UNKNOWN_PLAYER");
  if (currentPlayer(state).id !== playerId) throw new GameRuleError("NOT_YOUR_TURN");
  if (state.pendingDiscard) throw new GameRuleError("DISCARD_PENDING");
}

/** A player on the start tile with a freshly shuffled deck and their opening hand. */
function dealPlayer(
  { id, name }: NewPlayer,
  startTile: number,
  cards: readonly CardId[],
  random: RandomSource = Math.random,
): Player {
  const deck = buildDeck(id, cards, random);
  return {
    id,
    name,
    position: startTile,
    skipTurns: 0,
    ki: STARTING_KI,
    hand: deck.slice(0, STARTING_HAND),
    deck: deck.slice(STARTING_HAND),
    shielded: false,
    diceBoost: null,
  };
}
