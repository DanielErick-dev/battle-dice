import {
  abilityBlocker,
  DRAGON_HOARD_DRAWS,
  graceEnergy,
  LEVITATION_TURNS,
  rollBonus,
  type AbilityId,
} from "./abilities";
import { createBoard, type BoardDefinition } from "./board";
import { playCard, type CardChoice } from "./cardPlay";
import { STARTING_HAND, STARTING_ENERGY, standardDeck, type CardId } from "./cards";
import { GameRuleError, type GameCommand } from "./commands";
import { buildDeck } from "./deck";
import type { DiceRoller } from "./dice";
import { draftState, drawCard, playerIn, startDraft, updatePlayer, walkPath, type Draft } from "./draft";
import type { GameEvent } from "./events";
import { placeHiddenTraps } from "./hiddenTraps";
import { resolveLanding, resolveWard } from "./landing";
import type { RandomSource } from "./random";
import { endTurn } from "./turn";
import type { DiceBoost, GameState, Player, PlayerId } from "./types";

export interface NewPlayer {
  id: PlayerId;
  name: string;
  /** The character's ability; none by default. */
  ability?: AbilityId | null;
}

export interface GameDependencies {
  rollDice: DiceRoller;
  /** Shuffles decks (on restart, when a deck runs out); injected like the dice so games replay exactly. */
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

export function createGame(
  board: BoardDefinition,
  players: readonly NewPlayer[],
  options: GameOptions = {},
): GameState {
  if (players.length === 0) throw new Error("A game needs at least one player");

  const createdBoard = createBoard(board);
  const random = options.random ?? Math.random;
  const decks = Object.fromEntries(
    players.map((player) => [
      player.id,
      options.decks?.[player.id] ?? standardDeck({ withOpponents: players.length > 1 }),
    ]),
  );
  return {
    board: createdBoard,
    players: players.map((player, index) =>
      dealPlayer(player, {
        startTile: createdBoard.startTile,
        cards: decks[player.id],
        random,
        playsFirst: index === 0,
      }),
    ),
    decks,
    currentPlayerIndex: 0,
    status: "playing",
    winnerId: null,
    turn: 1,
    cardsPlayedThisTurn: 0,
    abilityInUse: null,
    bonusTurn: false,
    pendingDiscard: null,
    pendingWard: null,
    hiddenTraps: placeHiddenTraps(createdBoard, random),
    destroyedTraps: [],
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
      return playCardCommand(state, command.playerId, command.cardUid, command, deps);
    case "discardCard":
      return discardCard(state, command.playerId, command.cardUid, deps);
    case "activateAbility":
      return activateAbility(state, command.playerId, deps);
    case "answerWard":
      return answerWard(state, command.playerId, command.use, deps);
    case "restart":
      return restart(state, deps);
  }
}

function rollDice(state: GameState, playerId: PlayerId, deps: GameDependencies): GameTransition {
  assertCanAct(state, playerId);
  const draft = startDraft(state, deps.random);
  const player = playerIn(draft, playerId);

  const { event, boostLeft } = throwDice(playerId, player.diceBoost, rollBonus(state.abilityInUse), deps.rollDice);
  updatePlayer(draft, playerId, () => ({ diceBoost: boostLeft }));

  const path = walkPath(state.board, player.position, event.value);
  draft.events.push(event, { type: "playerMoved", playerId, path });
  resolveLanding(draft, playerId, path.at(-1) ?? player.position);

  const extraTurn = draft.extraTurn || state.bonusTurn;
  return settle(draft, playerId, { endsTurn: true, extraTurn });
}

type DiceRolledEvent = Extract<GameEvent, { type: "diceRolled" }>;

/**
 * Throws the dice as the player's pending card modifier says, plus `extra` tiles from their
 * ability, and what's left of the modifier afterwards.
 */
function throwDice(
  playerId: PlayerId,
  boost: DiceBoost | null,
  extra: number,
  rollDie: DiceRoller,
): { event: DiceRolledEvent; boostLeft: DiceBoost | null } {
  const { event, boostLeft } = throwBoostedDice(playerId, boost, rollDie);
  if (extra === 0) return { event, boostLeft };
  return {
    event: {
      ...event,
      value: event.value + extra,
      bonus: (event.bonus ?? 0) + extra,
    },
    boostLeft,
  };
}

function throwBoostedDice(
  playerId: PlayerId,
  boost: DiceBoost | null,
  rollDie: DiceRoller,
): { event: DiceRolledEvent; boostLeft: DiceBoost | null } {
  switch (boost?.kind) {
    case "fixed":
      return {
        event: {
          type: "diceRolled",
          playerId,
          value: boost.value,
          dice: [boost.value],
        },
        boostLeft: null,
      };
    case "double": {
      const dice = [rollDie(), rollDie()];
      return {
        event: { type: "diceRolled", playerId, value: dice[0] + dice[1], dice },
        boostLeft: null,
      };
    }
    case "best": {
      const dice = [rollDie(), rollDie()];
      return {
        event: {
          type: "diceRolled",
          playerId,
          value: Math.max(...dice),
          dice,
          best: true,
        },
        boostLeft: null,
      };
    }
    case "bonus": {
      const die = rollDie();
      const event = {
        type: "diceRolled",
        playerId,
        value: die + boost.amount,
        dice: [die],
        bonus: boost.amount,
      } as const;
      return {
        event,
        boostLeft: boost.rolls > 1 ? { ...boost, rolls: boost.rolls - 1 } : null,
      };
    }
    case undefined: {
      const die = rollDie();
      return {
        event: { type: "diceRolled", playerId, value: die, dice: [die] },
        boostLeft: null,
      };
    }
  }
}

function playCardCommand(
  state: GameState,
  playerId: PlayerId,
  cardUid: string,
  choice: CardChoice,
  deps: GameDependencies,
): GameTransition {
  assertCanAct(state, playerId);
  const draft = startDraft(state, deps.random);
  playCard(draft, playerId, cardUid, choice);

  const settled = settle(draft, playerId, {
    endsTurn: false,
    extraTurn: false,
  });
  const bonusTurn = state.bonusTurn || draft.extraTurn;
  const cardsPlayedThisTurn = state.cardsPlayedThisTurn + 1;
  return {
    ...settled,
    state: { ...settled.state, cardsPlayedThisTurn, bonusTurn },
  };
}

function discardCard(state: GameState, playerId: PlayerId, cardUid: string, deps: GameDependencies): GameTransition {
  if (state.status === "finished") throw new GameRuleError("GAME_FINISHED");
  const pending = state.pendingDiscard;
  if (!pending) throw new GameRuleError("NO_DISCARD_PENDING");
  if (pending.playerId !== playerId) throw new GameRuleError("NOT_YOUR_TURN");

  const draft = startDraft({ ...state, pendingDiscard: null }, deps.random);
  const candidates = [...playerIn(draft, playerId).hand, pending.drawn];
  const card = candidates.find((candidate) => candidate.uid === cardUid);
  if (!card) throw new GameRuleError("UNKNOWN_CARD");

  const hand = candidates.filter((candidate) => candidate.uid !== cardUid);
  updatePlayer(draft, playerId, (player) => ({
    hand,
    discard: [...player.discard, card],
  }));
  draft.events.push({ type: "cardDiscarded", playerId, card, hand });
  return settle(draft, playerId, {
    endsTurn: pending.endsTurn,
    extraTurn: pending.extraTurn,
  });
}

/** Spends the player's charged ability; its effect lasts for the rest of the turn. */
function activateAbility(state: GameState, playerId: PlayerId, deps: GameDependencies): GameTransition {
  assertCanAct(state, playerId);
  const draft = startDraft(state, deps.random);
  const player = playerIn(draft, playerId);
  const blocker = abilityBlocker(player, state.abilityInUse);
  if (blocker || !player.ability) throw new GameRuleError(blocker ?? "NO_ABILITY");

  const energyGained = graceEnergy(player);
  updatePlayer(draft, playerId, (current) => ({
    abilityCharge: 0,
    energy: current.energy + energyGained,
  }));
  draft.events.push({
    type: "abilityUsed",
    playerId,
    ability: player.ability,
    energyGained,
  });
  if (player.ability === "dragonHoard") {
    for (let draw = 0; draw < DRAGON_HOARD_DRAWS; draw++) drawCard(draft, playerId);
  }
  if (player.ability === "levitation") updatePlayer(draft, playerId, () => ({ levitating: LEVITATION_TURNS }));

  const settled = settle(draft, playerId, {
    endsTurn: false,
    extraTurn: false,
  });
  return {
    ...settled,
    state: { ...settled.state, abilityInUse: player.ability },
  };
}

/** Resumes a landing paused on the ward prompt with the player's answer. */
function answerWard(state: GameState, playerId: PlayerId, use: boolean, deps: GameDependencies): GameTransition {
  if (state.status === "finished") throw new GameRuleError("GAME_FINISHED");
  const pending = state.pendingWard;
  if (!pending) throw new GameRuleError("NO_WARD_PENDING");
  if (pending.playerId !== playerId) throw new GameRuleError("NOT_YOUR_TURN");

  const draft = startDraft({ ...state, pendingWard: null }, deps.random);
  resolveWard(draft, playerId, pending.tile, pending.threat, use);
  return settle(draft, playerId, {
    endsTurn: pending.endsTurn,
    extraTurn: pending.extraTurn || draft.extraTurn,
  });
}

/**
 * Turns a draft into the next state: a win ends the game, a ward prompt or an overflowing
 * draw pauses for the player's choice, and otherwise the turn ends if the command ends it.
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
      state: {
        ...draftState(draft),
        status: "finished",
        winnerId: playerId,
        pendingDiscard: null,
        pendingWard: null,
      },
      events: draft.events,
    };
  }

  if (draft.pendingWard) {
    const pendingWard = { playerId, ...draft.pendingWard, endsTurn, extraTurn };
    return {
      state: { ...draftState(draft), pendingWard },
      events: draft.events,
    };
  }

  if (draft.overflow) {
    const pendingDiscard = {
      playerId,
      drawn: draft.overflow,
      endsTurn,
      extraTurn,
    };
    return {
      state: { ...draftState(draft), pendingDiscard },
      events: draft.events,
    };
  }

  if (!endsTurn) return { state: draftState(draft), events: draft.events };

  const currentPlayerIndex = endTurn(draft, extraTurn);
  return {
    state: {
      ...draftState(draft),
      currentPlayerIndex,
      turn: state.turn + 1,
      cardsPlayedThisTurn: 0,
      abilityInUse: null,
      bonusTurn: false,
    },
    events: draft.events,
  };
}

function restart(state: GameState, deps: GameDependencies): GameTransition {
  const players = state.players.map((player, index) =>
    dealPlayer(player, {
      startTile: state.board.startTile,
      cards: state.decks[player.id],
      random: deps.random,
      playsFirst: index === 0,
    }),
  );
  return {
    state: {
      ...state,
      players,
      currentPlayerIndex: 0,
      status: "playing",
      winnerId: null,
      turn: 1,
      cardsPlayedThisTurn: 0,
      abilityInUse: null,
      bonusTurn: false,
      pendingDiscard: null,
      pendingWard: null,
      hiddenTraps: placeHiddenTraps(state.board, deps.random),
      destroyedTraps: [],
    },
    events: [{ type: "gameRestarted" }, { type: "turnChanged", playerId: players[0].id }],
  };
}

function assertCanAct(state: GameState, playerId: PlayerId): void {
  if (state.status === "finished") throw new GameRuleError("GAME_FINISHED");
  if (!state.players.some((player) => player.id === playerId)) throw new GameRuleError("UNKNOWN_PLAYER");
  if (currentPlayer(state).id !== playerId) throw new GameRuleError("NOT_YOUR_TURN");
  if (state.pendingDiscard) throw new GameRuleError("DISCARD_PENDING");
  if (state.pendingWard) throw new GameRuleError("WARD_PENDING");
}

interface Deal {
  startTile: number;
  cards: readonly CardId[];
  random: RandomSource;
  /** The first turn is already under way: it counts towards the ability. */
  playsFirst: boolean;
}

/** A player on the start tile with a freshly shuffled deck and their opening hand. */
function dealPlayer({ id, name, ability = null }: NewPlayer, { startTile, cards, random, playsFirst }: Deal): Player {
  const deck = buildDeck(id, cards, random);
  return {
    id,
    name,
    position: startTile,
    skipTurns: 0,
    energy: STARTING_ENERGY,
    energyCharge: 0,
    hand: deck.slice(0, STARTING_HAND),
    deck: deck.slice(STARTING_HAND),
    discard: [],
    shielded: false,
    diceBoost: null,
    ability,
    abilityCharge: ability && playsFirst ? 1 : 0,
    levitating: 0,
  };
}
