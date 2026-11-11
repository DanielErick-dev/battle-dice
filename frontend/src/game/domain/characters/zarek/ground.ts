import { getTile } from "../../board/board";
import { inHellTrack, isSpellGround } from "../../board/tileGround";
import { frozenTiles } from "../fairy/winter";
import type { Draft } from "../../core/draft";
import type { Board, TileId } from "../../board/types";
import type { GameState, PlayerId } from "../../core/state";

/** The board and the spells on it, as the state or the screen holds them. */
export type SpellBoard = Pick<GameState, "board" | "blackFlames" | "enchantedTiles" | "winter" | "voidScars"> & {
  seals: readonly { tile: TileId; owner: PlayerId }[];
  specters: readonly { tile: TileId; owner: PlayerId }[];
};

/** The draft's spells in the shape the ground queries take. */
export function draftView(draft: Draft): SpellBoard {
  return {
    board: draft.state.board,
    blackFlames: draft.blackFlames,
    enchantedTiles: draft.enchantedTiles,
    winter: draft.winter,
    seals: draft.seals,
    specters: draft.specters,
    voidScars: draft.voidScars,
  };
}

/** Main-path tiles (and rifts) a rift may open right after: anywhere short of the finish. */
function riftAnchors(board: Board): TileId[] {
  return board.tiles
    .filter(({ role, track, next }) => !track && next !== null && role !== "finish")
    .map(({ id }) => id);
}

function occupied(state: SpellBoard): Set<TileId> {
  return new Set([
    ...spellTiles(state),
    ...frozenTiles(state.winter, state.board.startTile),
    ...state.voidScars.map(({ tile }) => tile),
  ]);
}

/** Regular main-path and hell tiles free of every spell and mark, where a spell taken by the Void may land. */
export function spellGround(state: SpellBoard): TileId[] {
  const taken = occupied(state);
  return state.board.tiles
    .filter(isSpellGround)
    .filter(({ id }) => !taken.has(id))
    .map(({ id }) => id);
}

/** Another's spell, on the main path or in hell, that the ready Void may absorb (heaven keeps none). */
export function seizableTiles(state: SpellBoard, owner: PlayerId): TileId[] {
  const others = <T extends { tile: TileId; owner: PlayerId }>(list: readonly T[]) =>
    list.filter((entry) => entry.owner !== owner).map(({ tile }) => tile);
  const iced = state.winter && state.winter.owner !== owner ? state.winter.iced : [];
  const spells = [
    ...others(state.blackFlames),
    ...others(state.enchantedTiles),
    ...iced,
    ...others(state.seals),
    ...others(state.specters),
  ];
  return [...new Set(spells)].filter((tile) => isSpellGround(getTile(state.board, tile)));
}

/** Where a held harm may go: a rift after a main-path tile, or a mark on a free hell tile. */
export function harmGround(state: SpellBoard): TileId[] {
  const taken = occupied(state);
  // A track has no room for a new tile, so harms mark one there.
  const hell = state.board.tiles.filter((tile) => inHellTrack(tile) && !taken.has(tile.id));
  return [...riftAnchors(state.board), ...hell.map(({ id }) => id)];
}

/** Tiles holding a spell the idle Void may take over: fire, snow, the fairy's picked ice, seals, apparitions. */
function spellTiles(state: Omit<SpellBoard, "board">) {
  return [
    ...state.blackFlames.map(({ tile }) => tile),
    ...state.enchantedTiles.map(({ tile }) => tile),
    ...(state.winter?.iced ?? []),
    ...state.seals.map(({ tile }) => tile),
    ...state.specters.map(({ tile }) => tile),
  ];
}
