import { raidPiles } from "../characters/alchemist/condenser";
import { isAbilityReady } from "../abilities/charge";
import { isOverloaded } from "../characters/alva/systems";
import { isReactive } from "../abilities/ability";
import { CARD_CATALOG, DIVINE_CARDS, rarityLevel } from "../cards/catalog";
import { applyCommand } from "../core/engine";
import type { GameCommand } from "../core/commands";
import type { GameState, Player, PlayerId } from "../core/state";
import { hauntableTiles, PLUNDER_CARDS, SPECTER_KINDS, takenForSpecters } from "../characters/warden/specters";
import { SEAL_KINDS, sealableTiles } from "../characters/scribe/seals";
import { FLAME_TILES, flammableTiles } from "../characters/kage/flames";
import { frozenTiles } from "../characters/fairy/winter";
import { wallableTiles } from "../characters/tenzai/elements";
import type { TileId } from "../board/types";

type Choice = Omit<Extract<GameCommand, { type: "activateAbility" }>, "type" | "playerId">;

/**
 * A simple computer player: answers its prompts, plays its rarest card that works, uses its ability when ready
 * with the plainest choice the rules accept, then rolls. Null when nothing is up to it right now.
 */
export function botMove(state: GameState, playerId: PlayerId): GameCommand | null {
  if (state.status === "finished") return null;
  const prompt = answerPrompt(state, playerId);
  if (prompt !== undefined) return prompt;
  if (state.pendingDiscard || state.pendingWard || state.pendingGrace || state.pendingPlunder || state.pendingRaid) {
    return null;
  }
  const me = state.players[state.currentPlayerIndex];
  if (!me || me.id !== playerId) return null;
  return purge(state, me) ?? playCard(state, me) ?? activateIfReady(state, me) ?? { type: "rollDice", playerId };
}

/** The bot's answer to a prompt waiting on it; undefined when none is (null: one waits on someone else). */
function answerPrompt(state: GameState, playerId: PlayerId): GameCommand | null | undefined {
  const { pendingDiscard, pendingWard, pendingGrace, pendingPlunder, pendingRaid } = state;
  if (pendingDiscard?.playerId === playerId) {
    const me = playerOf(state, playerId);
    const cheapest = [...me.hand, pendingDiscard.drawn].sort(
      (a, b) => rarityLevel(a.cardId) - rarityLevel(b.cardId),
    )[0];
    return cheapest ? { type: "discardCard", playerId, cardUid: cheapest.uid } : null;
  }
  if (pendingWard?.playerId === playerId) return { type: "answerWard", playerId, use: true };
  if (pendingGrace?.playerId === playerId) {
    return pendingGrace.offer === "blessing"
      ? { type: "chooseGrace", playerId, blessing: "wings" }
      : { type: "chooseGrace", playerId, cardId: DIVINE_CARDS[0] };
  }
  if (pendingPlunder?.owner === playerId) {
    const hand = playerOf(state, pendingPlunder.victim).hand;
    return { type: "plunderCards", playerId, cardUids: hand.slice(0, PLUNDER_CARDS).map((card) => card.uid) };
  }
  if (pendingRaid?.owner === playerId) {
    // The rarest cards on offer.
    const { piles, picks } = raidPiles(state.players, pendingRaid);
    const offered = piles.flatMap((player) => player.discard);
    const best = [...offered].sort((a, b) => rarityLevel(b.cardId) - rarityLevel(a.cardId)).slice(0, picks);
    return { type: "raidGraveyard", playerId, cardUids: best.map((card) => card.uid) };
  }
  return undefined;
}

/** Clears Unidade Alva's spyware while the hand is heavy enough for her Overload, giving up its commonest card. */
function purge(state: GameState, me: Player): GameCommand | null {
  if (me.corrupted === 0 || !isOverloaded(me)) return null;
  const [cheapest] = [...me.hand].sort((a, b) => rarityLevel(a.cardId) - rarityLevel(b.cardId));
  if (!cheapest) return null;
  const command: GameCommand = { type: "purgeCorrupted", playerId: me.id, cardUid: cheapest.uid };
  return accepted(state, command) ? command : null;
}

function playCard(state: GameState, me: Player): GameCommand | null {
  const leader = leadingOpponent(state, me.id);
  const byRarity = [...me.hand].sort((a, b) => rarityLevel(b.cardId) - rarityLevel(a.cardId));
  for (const card of byRarity) {
    const sacrifices = CARD_CATALOG[card.cardId].sacrifices ?? 0;
    const command: GameCommand = {
      type: "playCard",
      playerId: me.id,
      cardUid: card.uid,
      ...(leader && { targetId: leader.id }),
      value: 6,
      element: "earth",
      ...(sacrifices > 0 && {
        sacrificeUids: me.hand
          .filter((other) => other.uid !== card.uid)
          .slice(0, sacrifices)
          .map((other) => other.uid),
      }),
    };
    if (accepted(state, command)) return command;
  }
  return null;
}

function activateIfReady(state: GameState, me: Player): GameCommand | null {
  if (!me.ability || isReactive(me.ability) || !isAbilityReady(me)) return null;
  const leader = leadingOpponent(state, me.id);
  const target: Choice = leader ? { targetId: leader.id } : {};
  const tries: Choice[] = [
    {},
    target,
    { power: "armour" },
    { volley: "opponents" },
    { element: "fire" },
    { element: "wind" },
    { ...target, element: "water" },
    { ...target, power: "halt" },
    ...placements(state, me),
  ];
  for (const choice of tries) {
    const command: GameCommand = { type: "activateAbility", playerId: me.id, ...choice };
    if (accepted(state, command)) return command;
  }
  return null;
}

/** Tile picks for the abilities that place things: just ahead of the opponents, where they'll walk. */
function placements(state: GameState, me: Player): Choice[] {
  const { board } = state;
  const opponents = state.players.filter((player) => player.id !== me.id).map((player) => player.position);
  const ahead = (tiles: readonly TileId[], count: number) => {
    const rear = Math.min(...opponents);
    const preferred = tiles.filter((tile) => tile > rear);
    return [...preferred, ...tiles.filter((tile) => tile <= rear)].slice(0, count);
  };
  const sealsAndSpecters = takenForSpecters(state.seals, state.specters);
  const burning = [...state.blackFlames, ...state.scarletFlames].map((flame) => flame.tile);
  const frozen = frozenTiles(state.winter, board.startTile);
  const walls = wallableTiles(board, state.players, state.elementals);
  return [
    { sealTiles: ahead(sealableTiles(board, me.position, sealsAndSpecters), SEAL_KINDS.length) },
    { specterTiles: ahead(hauntableTiles(board, me.position, sealsAndSpecters), SPECTER_KINDS.length) },
    { power: "flames", flameTiles: ahead(flammableTiles(board, me.position, [...burning, ...frozen]), FLAME_TILES) },
    ...(walls.length > 0 ? [{ element: "earth" as const, wallTile: ahead(walls, 1)[0] }] : []),
  ];
}

/** The rules decide what's legal: a command that throws isn't. */
function accepted(state: GameState, command: GameCommand): boolean {
  try {
    applyCommand(state, command);
    return true;
  } catch {
    return false;
  }
}

function leadingOpponent(state: GameState, playerId: PlayerId): Player | null {
  return state.players
    .filter((player) => player.id !== playerId)
    .reduce<Player | null>((best, player) => (best && best.position >= player.position ? best : player), null);
}

function playerOf(state: GameState, playerId: PlayerId): Player {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Unknown player ${playerId}`);
  return player;
}
