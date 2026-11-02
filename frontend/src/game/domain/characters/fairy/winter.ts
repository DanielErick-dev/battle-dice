import { chargeAbility } from "../../abilities/charge";
import { getTile } from "../../board/board";
import { GameRuleError } from "../../core/errors";
import { MAX_ENERGY } from "../../core/energy";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { walkPath } from "../../board/paths";
import { groundSpellsSpare, isUntouchable } from "../../core/playerStatus";
import type { EnchantedTile, Winter } from "./types";
import type { Board, TileId } from "../../board/types";
import type { PlayerId } from "../../core/state";

export const ENCHANT_TILES = 3;
export const ENCHANT_ADVANCE = 5;
/** Rounds (lost turns) an opponent stays stuck in the fairy's snow. */
export const ENCHANT_FREEZE = 2;
/** Tiles frozen per round. */
export const WINTER_TILES = 6;
/** Once winter has begun, the tiles the fairy's ability freezes, wherever she likes. */
export const WINTER_PICKS = 1;
/** Energy drained into the fairy per round stuck in her snow. */
export const SNOW_DRAIN = 1;
/** Rounds hell's fire takes to melt the fairy's ice there. */
export const HELL_ICE_ROUNDS = 10;
/** Half melted, hell ice only carries her this far. */
export const HELL_ICE_WEAK_AT = 5;
export const HELL_ICE_WEAK_ADVANCE = 3;

/** Enchants the harm ahead for good; once none is left ahead, Eternal Winter begins. */
export function bloom(draft: Draft, playerId: PlayerId): void {
  const tiles = harmfulAhead(draft, playerIn(draft, playerId).position, ENCHANT_TILES);
  draft.enchantedTiles = [...draft.enchantedTiles, ...tiles.map((tile) => ({ tile, owner: playerId }))];
  draft.hiddenTraps = draft.hiddenTraps.filter((tile) => !tiles.includes(tile));
  draft.pinnedTraps = draft.pinnedTraps.filter((tile) => !tiles.includes(tile));
  draft.events.push({ type: "tilesEnchanted", playerId, tiles });
  if (!draft.winter && harmfulAhead(draft, playerIn(draft, playerId).position, Infinity).length === 0) {
    draft.winter = { owner: playerId, frontier: draft.state.board.startTile, iced: [] };
    draft.events.push({ type: "winterBegan", playerId });
  }
}

/** Once per round, never freezing the finish itself; hell melts its ice a round more. */
export function spreadWinter(draft: Draft): void {
  meltHellIce(draft);
  const { winter } = draft;
  const { finishTile } = draft.state.board;
  if (!winter || winter.frontier >= finishTile - 1) return;
  const to = Math.min(finishTile - 1, winter.frontier + WINTER_TILES);
  draft.events.push({ type: "winterSpread", owner: winter.owner, from: winter.frontier + 1, to });
  draft.winter = { ...winter, frontier: to, iced: winter.iced.filter((tile) => tile > to) };
  // Winter beats fire: the ice puts out black fire as it reaches it.
  draft.blackFlames = draft.blackFlames.filter((flame) => flame.tile <= winter.frontier || flame.tile > to);
}

function meltHellIce(draft: Draft): void {
  const { winter } = draft;
  if (!winter?.melting?.length) return;
  const melting = winter.melting
    .map((ice) => ({ ...ice, rounds: ice.rounds + 1 }))
    .filter((ice) => ice.rounds < HELL_ICE_ROUNDS);
  draft.winter = { ...winter, melting };
}

/** The main path up to the frontier, her picks beyond it, and her ice in hell; never the start or finish. */
export function isFrozen(winter: Winter | null, startTile: TileId, tile: TileId): boolean {
  if (winter === null) return false;
  if (winter.melting?.some((ice) => ice.tile === tile)) return true;
  return tile > startTile && (tile <= winter.frontier || winter.iced.includes(tile));
}

/** Every frozen tile, along the path then the fairy's picks beyond it and in hell. */
export function frozenTiles(winter: Winter | null, startTile: TileId): TileId[] {
  if (!winter) return [];
  const path = Array.from({ length: Math.max(0, winter.frontier - startTile) }, (_, index) => startTile + 1 + index);
  return [...path, ...winter.iced, ...(winter.melting ?? []).map(({ tile }) => tile)];
}

function inHellTrack(board: Board, tile: TileId): boolean {
  return getTile(board, tile).track?.realm === "infernal";
}

/** Any main-path or hell tile not frozen or snowed yet, burning ones too, nearest first; never the start or finish. */
export function freezableTiles(
  board: Board,
  position: TileId,
  winter: Winter | null,
  snowed: readonly EnchantedTile[],
): TileId[] {
  const taken = new Set(snowed.map(({ tile }) => tile));
  const ground = ({ id, role, track }: Board["tiles"][number]) =>
    (role === "regular" && !track) || inHellTrack(board, id);
  return board.tiles
    .filter((tile) => ground(tile) && !taken.has(tile.id) && !isFrozen(winter, board.startTile, tile.id))
    .map(({ id }) => id)
    .sort((a, b) => Math.abs(a - position) - Math.abs(b - position) || a - b);
}

/** Up to WINTER_PICKS tiles of her choice freeze, as the winter's own. */
export function freezeTiles(draft: Draft, playerId: PlayerId, tiles: readonly TileId[]): void {
  const { winter } = draft;
  const allowed = freezableTiles(draft.state.board, playerIn(draft, playerId).position, winter, draft.enchantedTiles);
  if (
    !winter ||
    tiles.length === 0 ||
    tiles.length > WINTER_PICKS ||
    new Set(tiles).size !== tiles.length ||
    tiles.some((tile) => !allowed.includes(tile))
  ) {
    throw new GameRuleError("INVALID_FROST");
  }
  const { board } = draft.state;
  const hell = tiles.filter((tile) => inHellTrack(board, tile));
  draft.winter = {
    ...winter,
    iced: [...winter.iced, ...tiles.filter((tile) => !hell.includes(tile))],
    ...(hell.length > 0 && { melting: [...(winter.melting ?? []), ...hell.map((tile) => ({ tile, rounds: 0 }))] }),
  };
  draft.blackFlames = draft.blackFlames.filter((flame) => !tiles.includes(flame.tile));
  draft.events.push({ type: "tilesFrozen", playerId, tiles: [...tiles] });
}

/** The first `count` tiles ahead holding harm not yet enchanted. */
function harmfulAhead(draft: Draft, from: TileId, count: number): TileId[] {
  const { board } = draft.state;
  const found: TileId[] = [];
  let tile = getTile(board, from).next;
  while (tile !== null && found.length < count) {
    // Snow can't settle on black fire: fire beats frost.
    const burning = draft.blackFlames.some((flame) => flame.tile === tile);
    if (isHarmful(draft, tile) && !burning && !draft.enchantedTiles.some((enchanted) => enchanted.tile === tile)) {
      found.push(tile);
    }
    tile = getTile(board, tile).next;
  }
  return found;
}

function isHarmful(draft: Draft, tile: TileId): boolean {
  if (draft.hiddenTraps.includes(tile)) return true;
  if (draft.destroyedTraps.includes(tile)) return false;
  const { kind } = getTile(draft.state.board, tile).effect;
  return kind === "trap" || kind === "curse";
}

/** Whose snow lies on the tile: an enchanted tile's, or the winter's ice, which works just the same. */
function snowOwner(draft: Draft, tile: TileId): PlayerId | null {
  const enchanted = draft.enchantedTiles.find((candidate) => candidate.tile === tile);
  if (enchanted) return enchanted.owner;
  const { winter } = draft;
  return winter && isFrozen(winter, draft.state.board.startTile, tile) ? winter.owner : null;
}

/** True on snow or ice, so nothing else on it happens; the owner is carried, an opponent snowed in. */
export function stirEnchantment(draft: Draft, playerId: PlayerId, tile: TileId): boolean {
  const owner = snowOwner(draft, tile);
  if (!owner) return false;
  const own = ownSnow(draft, playerId, owner);
  if (!own && groundSpellsSpare(playerIn(draft, playerId))) return true;

  if (!own && isUntouchable(playerIn(draft, playerId))) {
    draft.events.push({ type: "armourHeld", playerId, tile });
    return true;
  }
  // An Arcane Shield keeps them out of the snow and is spent; the snow stays for the next.
  if (!own && playerIn(draft, playerId).shielded) {
    updatePlayer(draft, playerId, () => ({ shielded: false }));
    draft.events.push({ type: "trapBlocked", playerId, tile, ward: "shield", hidden: false });
    return true;
  }

  const frozen = own ? 0 : ENCHANT_FREEZE;
  if (!own) snowIn(draft, playerId, owner, frozen);
  stir(draft, playerId, owner, tile, frozen);
  if (own) carryOnSnow(draft, playerId, tile);
  return true;
}

/** How far her snow carries her from `tile`: less off hell ice the fire has half melted. */
function carry(winter: Winter | null, tile: TileId): number {
  const ice = winter?.melting?.find((candidate) => candidate.tile === tile);
  return ice && ice.rounds >= HELL_ICE_WEAK_AT ? HELL_ICE_WEAK_ADVANCE : ENCHANT_ADVANCE;
}

/** Only stopping on more of their own snow carries them on again; wherever else they stop does nothing. */
function carryOnSnow(draft: Draft, playerId: PlayerId, from: TileId): void {
  let tile = from;
  for (;;) {
    const { realmEntry } = playerIn(draft, playerId);
    const path = walkPath(draft.state.board, tile, carry(draft.winter, tile), realmEntry);
    if (path.length === 0) return;
    draft.events.push({ type: "playerMoved", playerId, path });
    tile = path.at(-1) ?? tile;
    updatePlayer(draft, playerId, () => ({ position: tile }));
    const owner = snowOwner(draft, tile);
    if (!owner || !ownSnow(draft, playerId, owner)) return;
    stir(draft, playerId, owner, tile, 0);
  }
}

/** On each lost turn in the snow; what doesn't fit the fairy's bar is lost. */
export function drainSnow(draft: Draft, playerId: PlayerId): void {
  const { snowbound, energy } = playerIn(draft, playerId);
  if (!snowbound) return;
  const taken = Math.min(SNOW_DRAIN, energy);
  updatePlayer(draft, playerId, (player) => ({
    energy: player.energy - taken,
    snowbound: snowbound.rounds > 1 ? { ...snowbound, rounds: snowbound.rounds - 1 } : null,
  }));
  updatePlayer(draft, snowbound.owner, (owner) => ({ energy: Math.min(MAX_ENERGY, owner.energy + taken) }));
  draft.events.push({ type: "snowDrained", playerId, owner: snowbound.owner, energy: taken });
}

function snowIn(draft: Draft, playerId: PlayerId, owner: PlayerId, rounds: number): void {
  updatePlayer(draft, playerId, (player) => ({
    skipTurns: player.skipTurns + rounds,
    snowbound: { owner, rounds: Math.max(rounds, player.snowbound?.rounds ?? 0) },
  }));
}

function ownSnow(draft: Draft, playerId: PlayerId, owner: PlayerId): boolean {
  return owner === playerId || draft.players.length === 1;
}

/** Every stir charges the owner's ability a turn. */
function stir(draft: Draft, playerId: PlayerId, owner: PlayerId, tile: TileId, frozen: number): void {
  const before = playerIn(draft, owner);
  const { player: charged, becameReady } = chargeAbility(before);
  updatePlayer(draft, owner, () => ({ abilityCharge: charged.abilityCharge }));
  draft.events.push({
    type: "enchantmentStirred",
    playerId,
    owner,
    tile,
    frozen,
    charged: charged.abilityCharge > before.abilityCharge,
  });
  if (becameReady && charged.ability)
    draft.events.push({ type: "abilityReady", playerId: owner, ability: charged.ability });
}
