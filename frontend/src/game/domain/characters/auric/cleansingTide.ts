import { getTile } from "../../board/board";
import { playerIn, type Draft } from "../../core/draft";
import { relocateHiddenTrap } from "../../board/hiddenTraps";
import type { Board, PlayerId, TileId } from "../../types";

export const TIDE_RANGE = 20;

/** The player's tile plus the TIDE_RANGE tiles ahead. */
function tideReach(board: Board, from: TileId): TileId[] {
  const tiles = [from];
  let tile = getTile(board, from).next;
  while (tile !== null && tiles.length <= TIDE_RANGE) {
    tiles.push(tile);
    tile = getTile(board, tile).next;
  }
  return tiles;
}

/** Sweeps every spell, whoever cast it; a freed hidden trap moves, as when walked past. */
export function cleansingTide(draft: Draft, playerId: PlayerId): void {
  const path = tideReach(draft.state.board, playerIn(draft, playerId).position);
  const reach = new Set(path);
  const swept = (tile: TileId) => reach.has(tile);
  const tiles = [
    ...draft.blackFlames.map((flame) => flame.tile),
    ...draft.enchantedTiles.map((enchanted) => enchanted.tile),
    ...draft.specters.map((specter) => specter.tile),
    ...draft.seals.map((seal) => seal.tile),
    ...draft.pinnedTraps,
  ].filter(swept);
  for (const tile of draft.pinnedTraps.filter(swept)) {
    if (!draft.hiddenTraps.includes(tile)) continue;
    draft.hiddenTraps = relocateHiddenTrap(draft.state.board, draft.hiddenTraps, tile, draft.random, [
      ...draft.destroyedTraps,
    ]);
  }
  draft.blackFlames = draft.blackFlames.filter((flame) => !swept(flame.tile));
  draft.enchantedTiles = draft.enchantedTiles.filter((enchanted) => !swept(enchanted.tile));
  draft.specters = draft.specters.filter((specter) => !swept(specter.tile));
  draft.seals = draft.seals.filter((seal) => !swept(seal.tile));
  draft.pinnedTraps = draft.pinnedTraps.filter((tile) => !swept(tile));
  draft.events.push({ type: "boardCleansed", playerId, reach: path, tiles: [...new Set(tiles)] });
}
