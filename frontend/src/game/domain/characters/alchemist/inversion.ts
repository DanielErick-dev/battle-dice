import { at } from "../../core/invariant";
import { getTile } from "../../board/board";
import { pushPath, walkPath } from "../../board/paths";
import { applyCurse, moveHiddenTrap, threatAt, TRAP_DRAIN_ENERGY } from "../../board/harm";
import { HIDDEN_TRAP_PUSH } from "../../board/hiddenTraps";
import { drawCard, discardRandom } from "../../cards/hand";
import { gainEnergy } from "../../core/energy";
import { moveTo, playerIn, updatePlayer, type Draft } from "../../core/draft";
import { isUntouchable } from "../../core/playerStatus";
import { walkThroughWalls } from "../tenzai/elements";
import type { Blessing, Board, RealmKind, TileId, TrapCurse } from "../../board/types";
import type { Player, PlayerId } from "../../core/state";
import type { InvertedOutcome } from "./types";

/** Own turns the Great Alchemical Inversion lasts from her ability, and from the Magnum Opus. */
export const INVERSION_TURNS = 2;
export const OPUS_INVERSION_TURNS = 4;

export function isAlchemist(player: Player): boolean {
  return player.ability === "grandInversion";
}

/** Starts (or stretches) her Inversion: the turn it starts on ends at once, so `turns` whole rounds still follow. */
export function startInversion(draft: Draft, owner: PlayerId, turns: number): void {
  const current = draft.inversion?.owner === owner ? draft.inversion.turnsLeft : 0;
  draft.inversion = { owner, turnsLeft: Math.max(current, turns + 1) };
  draft.events.push({ type: "inversionStarted", playerId: owner, turns });
}

/** One of `owner`'s turns is a round for her Inversion. */
export function wearInversion(draft: Draft, owner: PlayerId): void {
  if (draft.inversion?.owner !== owner) return;
  const turnsLeft = draft.inversion.turnsLeft - 1;
  if (turnsLeft > 0) {
    draft.inversion = { owner, turnsLeft };
    return;
  }
  draft.inversion = null;
  draft.events.push({ type: "inversionEnded", playerId: owner });
}

/** What the tile reading looks at: the board and what has emptied or covered its tiles (hidden traps if known). */
export interface TileTable {
  board: Board;
  pinnedTraps: readonly TileId[];
  enchantedTiles: readonly { tile: TileId }[];
  destroyedTraps: readonly TileId[];
  /** Only the rules know them; a screen leaves them out. */
  hiddenTraps?: readonly TileId[];
}

export function tableOf(draft: Draft): TileTable {
  return { ...draft, board: draft.state.board };
}

/** A harm on the tile right now: a trap, curse or hidden trap still there, a lost turn, or hell's gate. */
export function isNegativeTile(table: TileTable, tile: TileId): boolean {
  if (table.pinnedTraps.includes(tile) || table.enchantedTiles.some((enchanted) => enchanted.tile === tile)) {
    return false;
  }
  if (table.hiddenTraps?.includes(tile)) return true;
  const { effect } = getTile(table.board, tile);
  if (effect.kind === "trap" || effect.kind === "curse" || effect.kind === "skipTurn") {
    return !table.destroyedTraps.includes(tile);
  }
  return effect.kind === "portal" && effect.realm === "infernal";
}

/** A gift on the tile: an advance, an extra turn, a card draw, a blessing, or heaven's gate. */
export function isPositiveTile(table: TileTable, tile: TileId): boolean {
  if (isNegativeTile(table, tile)) return false;
  const { effect } = getTile(table.board, tile);
  switch (effect.kind) {
    case "advance":
    case "extraTurn":
    case "blessing":
      return true;
    case "card":
      return effect.cardId === undefined;
    case "portal":
      return effect.realm === "celestial";
    default:
      return false;
  }
}

/** The first tile ahead of `player` (on their way, up to `reach`) that `wanted` picks, and the path to it. */
export function tileAhead(
  board: Board,
  player: Player,
  reach: number,
  wanted: (tile: TileId) => boolean,
): { tile: TileId; path: TileId[] } | null {
  const way = walkPath(board, player.position, reach, player.realmEntry);
  const index = way.findIndex(wanted);
  return index === -1 ? null : { tile: at(way, index), path: way.slice(0, index + 1) };
}

/**
 * Called as a tile is about to act on `playerId`: under the Inversion it acts the other way round (a harm turns
 * into its opposite boon for her, a gift into its opposite harm for her opponents). True when it took over.
 */
export function invertedLanding(draft: Draft, playerId: PlayerId, tile: TileId): boolean {
  const inversion = draft.inversion;
  if (!inversion) return false;
  if (inversion.owner === playerId)
    return isNegativeTile(tableOf(draft), tile) && turnInHerFavour(draft, playerId, tile);
  if (!isPositiveTile(tableOf(draft), tile)) return false;
  corruptGift(draft, playerId, tile, inversion.owner);
  return true;
}

/** The harm on `tile` as its opposite boon for her, measured from wherever she stands now. False if none. */
export function turnInHerFavour(draft: Draft, playerId: PlayerId, tile: TileId): boolean {
  const { board } = draft.state;
  const { effect, rift } = getTile(board, tile);
  const times = rift?.doubled ? 2 : 1;
  const threat = threatAt(draft, tile);
  if (threat === "hiddenTrap") {
    moveHiddenTrap(draft, tile);
    advance(draft, playerId, tile, HIDDEN_TRAP_PUSH);
    return true;
  }
  if (threat === "trap" && effect.kind === "trap") {
    advance(draft, playerId, tile, Math.max(1, tile - effect.to));
    if (effect.curse) for (let n = 0; n < times; n++) blessInstead(draft, playerId, tile, effect.curse);
    return true;
  }
  if (threat === "curse" && effect.kind === "curse") {
    for (let n = 0; n < times; n++) blessInstead(draft, playerId, tile, effect.curse);
    return true;
  }
  if (effect.kind === "skipTurn" && !draft.destroyedTraps.includes(tile)) {
    // As many turns played as the tile would have taken.
    updatePlayer(draft, playerId, (player) => ({
      alchemist: { ...player.alchemist, extraTurns: player.alchemist.extraTurns + times },
    }));
    draft.events.push({ type: "tileInverted", playerId, tile, outcome: "extraTurns", amount: times });
    return true;
  }
  if (effect.kind === "portal" && effect.realm === "infernal") {
    if (enterRealm(draft, playerId, "celestial")) {
      draft.events.push({ type: "tileInverted", playerId, tile, outcome: "heaven" });
    }
    return true;
  }
  return false;
}

/** A gift on `tile` turned into its opposite harm for `playerId` (an opponent of `owner`). */
export function corruptGift(draft: Draft, playerId: PlayerId, tile: TileId, owner: PlayerId): void {
  const { board } = draft.state;
  const { effect } = getTile(board, tile);
  const event = (outcome: InvertedOutcome, amount?: number) =>
    draft.events.push({ type: "tileInverted", playerId, tile, outcome, ...(amount !== undefined && { amount }) });
  if (isUntouchable(playerIn(draft, playerId))) {
    event("resisted");
    return;
  }
  switch (effect.kind) {
    case "advance": {
      const back = Math.max(1, effect.to - tile);
      const path = pushPath(board, playerIn(draft, playerId).position, back, playerIn(draft, playerId).realmEntry);
      event("pushBack", path.length);
      draft.events.push({ type: "playerPushed", playerId, by: owner, path });
      moveTo(draft, playerId, path.at(-1) ?? tile);
      return;
    }
    case "extraTurn":
      event("loseTurn", 1);
      draft.events.push({ type: "skipTurnGained", playerId, tile });
      updatePlayer(draft, playerId, (player) => ({ skipTurns: player.skipTurns + 1 }));
      return;
    case "card":
      event("discard");
      discardRandom(draft, playerId);
      return;
    case "blessing": {
      const curse = CURSE_OF[effect.blessing];
      event(curse === "drain" ? "drain" : "discard");
      applyCurse(draft, playerId, curse);
      return;
    }
    case "portal":
      if (enterRealm(draft, playerId, "infernal")) event("hell");
      return;
    default:
      return;
  }
}

/** Each blessing's dark twin: the energy ones drain energy, the rest cost a card. */
const CURSE_OF: Readonly<Record<Blessing, TrapCurse>> = {
  energy: "drain",
  spring: "drain",
  charge: "discard",
  shield: "discard",
  wings: "discard",
  halo: "discard",
  inspiration: "discard",
};

/** A curse turned over: a lost card becomes a drawn one, drained energy becomes energy gained. */
function blessInstead(draft: Draft, playerId: PlayerId, tile: TileId, curse: TrapCurse): void {
  if (curse === "discard") {
    draft.events.push({ type: "tileInverted", playerId, tile, outcome: "draw", amount: 1 });
    drawCard(draft, playerId);
    return;
  }
  const gained = gainEnergy(draft, playerId, TRAP_DRAIN_ENERGY);
  draft.events.push({ type: "tileInverted", playerId, tile, outcome: "energy", amount: gained });
}

/**
 * Walks her `tiles` forward from where she stands; the tile she reaches does nothing. A wall takes the blow as it
 * would a roll's (it loses what's left of the walk, crumbling if that's more than its hp).
 */
function advance(draft: Draft, playerId: PlayerId, tile: TileId, tiles: number): void {
  const player = playerIn(draft, playerId);
  const way = walkPath(draft.state.board, player.position, tiles, player.realmEntry);
  const announceAt = draft.events.length;
  const walked = walkThroughWalls(draft, playerId, way, (stretch) =>
    draft.events.push({ type: "playerMoved", playerId, path: [...stretch] }),
  );
  // Announced ahead of the walk and any blow on a wall, with how far she really got.
  draft.events.splice(announceAt, 0, {
    type: "tileInverted",
    playerId,
    tile,
    outcome: "advance",
    amount: walked.length,
  });
  if (walked.length > 0) moveTo(draft, playerId, walked.at(-1) ?? player.position);
}

/** Into the first tile of `realm`, coming back out where they were taken from; false without that realm. */
function enterRealm(draft: Draft, playerId: PlayerId, realm: RealmKind): boolean {
  const track = draft.state.board.tracks.find((candidate) => candidate.realm === realm);
  if (!track) return false;
  const from = playerIn(draft, playerId).position;
  const to = at(track.tiles, 0);
  updatePlayer(draft, playerId, () => ({ position: to, realmEntry: { portal: from, exit: from } }));
  draft.events.push({ type: "realmEntered", playerId, realm, from, to });
  return true;
}
