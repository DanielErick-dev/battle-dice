import { getTile } from "../../board/board";
import { byDistanceFrom, inHellTrack, isSpellGround } from "../../board/tileGround";
import { GameRuleError } from "../../core/errors";
import { playerIn, type Draft } from "../../core/draft";
import type { EnchantedTile, Winter } from "./types";
import type { Board, TileId } from "../../board/types";
import type { PlayerId } from "../../core/state";

/** Tiles frozen per round. */
export const WINTER_TILES = 6;
/** Once winter has begun, the tiles the fairy's ability freezes, wherever she likes. */
export const WINTER_PICKS = 1;
/** Rounds hell's fire takes to melt the fairy's ice there. */
export const HELL_ICE_ROUNDS = 10;

/** Once per round, never freezing the finish itself; hell melts its ice a round more. */
export function spreadWinter(draft: Draft): void {
  meltHellIce(draft);
  const { winter } = draft;
  const { finishTile } = draft.state.board;
  if (!winter || winter.frontier >= finishTile - 1) return;
  const to = Math.min(finishTile - 1, winter.frontier + WINTER_TILES);
  draft.events.push({ type: "winterSpread", owner: winter.owner, from: winter.frontier + 1, to });
  // Akane's scarlet fire holds the ice off: those tiles stay thawed.
  const held = draft.scarletFlames.map((flame) => flame.tile).filter((tile) => tile > winter.frontier && tile <= to);
  draft.winter = {
    ...winter,
    frontier: to,
    iced: winter.iced.filter((tile) => tile > to),
    ...(held.length > 0 && { thawed: [...(winter.thawed ?? []), ...held] }),
  };
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
  if (winter === null || winter.thawed?.includes(tile)) return false;
  if (winter.melting?.some((ice) => ice.tile === tile)) return true;
  return tile > startTile && (tile <= winter.frontier || winter.iced.includes(tile));
}

/** Every frozen tile, along the path then the fairy's picks beyond it and in hell. */
export function frozenTiles(winter: Winter | null, startTile: TileId): TileId[] {
  if (!winter) return [];
  const path = Array.from({ length: Math.max(0, winter.frontier - startTile) }, (_, index) => startTile + 1 + index);
  const tiles = [...path, ...winter.iced, ...(winter.melting ?? []).map(({ tile }) => tile)];
  return winter.thawed ? tiles.filter((tile) => !winter.thawed?.includes(tile)) : tiles;
}

/** Akane's fire melts the ice on `tiles` for good; returns the ones that were frozen. */
export function thaw(draft: Draft, tiles: readonly TileId[]): TileId[] {
  const { winter } = draft;
  const { startTile } = draft.state.board;
  const frozen = tiles.filter((tile) => isFrozen(winter, startTile, tile));
  if (!winter || frozen.length === 0) return [];
  draft.winter = {
    ...winter,
    iced: winter.iced.filter((tile) => !frozen.includes(tile)),
    melting: winter.melting?.filter((ice) => !frozen.includes(ice.tile)),
    thawed: [...(winter.thawed ?? []), ...frozen.filter((tile) => tile <= winter.frontier)],
  };
  return frozen;
}

/** Any main-path or hell tile not frozen or snowed yet, burning ones too, nearest first; never the start or finish. */
export function freezableTiles(
  board: Board,
  position: TileId,
  winter: Winter | null,
  snowed: readonly EnchantedTile[],
  scarlet: readonly TileId[] = [],
): TileId[] {
  // Akane's fire is the one fire her ice can't put out.
  const taken = new Set([...snowed.map(({ tile }) => tile), ...scarlet]);
  return board.tiles
    .filter((tile) => isSpellGround(tile) && !taken.has(tile.id) && !isFrozen(winter, board.startTile, tile.id))
    .map(({ id }) => id)
    .sort(byDistanceFrom(position));
}

/** Up to WINTER_PICKS tiles of her choice freeze, as the winter's own. */
export function freezeTiles(draft: Draft, playerId: PlayerId, tiles: readonly TileId[]): void {
  const { winter } = draft;
  const allowed = freezableTiles(
    draft.state.board,
    playerIn(draft, playerId).position,
    winter,
    draft.enchantedTiles,
    draft.scarletFlames.map((flame) => flame.tile),
  );
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
  const hell = tiles.filter((tile) => inHellTrack(getTile(board, tile)));
  draft.winter = {
    ...winter,
    iced: [...winter.iced, ...tiles.filter((tile) => !hell.includes(tile))],
    thawed: winter.thawed?.filter((tile) => !tiles.includes(tile)),
    ...(hell.length > 0 && { melting: [...(winter.melting ?? []), ...hell.map((tile) => ({ tile, rounds: 0 }))] }),
  };
  draft.blackFlames = draft.blackFlames.filter((flame) => !tiles.includes(flame.tile));
  draft.events.push({ type: "tilesFrozen", playerId, tiles: [...tiles] });
}
