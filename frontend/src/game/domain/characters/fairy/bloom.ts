import { getTile } from "../../board/board";
import { playerIn, type Draft } from "../../core/draft";
import type { TileId } from "../../board/types";
import type { PlayerId } from "../../core/state";

export const ENCHANT_TILES = 3;

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

/** The first `count` tiles ahead holding harm not yet enchanted. */
function harmfulAhead(draft: Draft, from: TileId, count: number): TileId[] {
  const { board } = draft.state;
  const found: TileId[] = [];
  let tile = getTile(board, from).next;
  while (tile !== null && found.length < count) {
    // Snow can't settle on black fire: fire beats frost.
    const burning =
      draft.blackFlames.some((flame) => flame.tile === tile) ||
      draft.scarletFlames.some((flame) => flame.tile === tile);
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
