/** What the camera watches and where the dice land. */
import { getTile } from "@/game/domain/board/board";
import type { Board, RealmKind } from "@/game/domain/types";
import type { MatchView } from "../model/matchView";
import { TILE_PITCH, type BoardLayout, type Vec3 } from "./boardLayout";

/** The tile of whoever is moving, else whoever plays next. */
export function focusTile(view: MatchView): number | null {
  // Hell's Drag is watched where the hand comes up.
  if (view.fx.drag && view.fx.drag.phase !== "over") return view.fx.drag.from;
  const id = view.movingPlayerId ?? view.activePlayerId;
  return view.players.find((candidate) => candidate.id === id)?.position ?? null;
}

export function focusPoint(view: MatchView, layout: BoardLayout): Vec3 {
  // The fairy's snow is followed to each tile it enchants.
  if (view.fx.frostStream) return layout.position(view.fx.frostStream.tile);
  // Arrow Rain followed from the bow to where it falls: amid its targets, until it has landed.
  const volley = view.fx.volley;
  if (volley && !volley.settled && volley.targets.length > 0) {
    const points = volley.targets.map((tile) => layout.position(tile));
    return [0, 1, 2].map((axis) => points.reduce((sum, point) => sum + point[axis], 0) / points.length) as Vec3;
  }
  // Themis's verdict is watched on her, the one it protects, not on whoever aimed at her.
  const verdict = view.fx.verdict;
  if (verdict && (view.effect?.kind === "verdict" || view.effect?.kind === "weighed")) {
    const judge = view.players.find((player) => player.id === verdict.judgeId);
    if (judge) return layout.position(judge.position);
  }
  // Cronos bending an opponent's time: watched on them.
  if (view.effect?.kind === "timeBent") return layout.position(view.effect.from);
  // A rolling tide is watched from halfway along its reach.
  if (view.fx.tide?.rolling) return layout.position(view.fx.tide.path[Math.floor(view.fx.tide.path.length / 2)]);
  const tile = focusTile(view);
  return tile === null ? [0, 0, 0] : layout.position(tile);
}

/** The realm a tile belongs to, or null on the main path: the world takes on its look. */
export function realmAt(board: Board, tile: number | null): RealmKind | null {
  return tile === null ? null : (getTile(board, tile).track?.realm ?? null);
}

/** The `index`-th die of the current throw (a second one only under Berserk Fury or Oracle Eye). */
export function dieRoll(view: MatchView, index: number): { id: number; value: number } | null {
  const value = view.roll?.dice[index];
  return view.roll && value !== undefined ? { id: view.roll.id, value } : null;
}

/** Beside the thrower's tile, towards the camera, so the dice land in view; a second die lands alongside. */
export function diceLanding(view: MatchView, board: Board, layout: BoardLayout, index: number): Vec3 {
  const tile = focusTile(view);
  // Realm track tiles float apart with nothing beside them: the dice land on the tiles ahead.
  if (tile !== null && getTile(board, tile).track) {
    let ahead = tile;
    for (let step = 0; step <= index; step++) ahead = getTile(board, ahead).next ?? ahead;
    return layout.position(ahead);
  }
  const [x, y, z] = focusPoint(view, layout);
  return [x + TILE_PITCH * (0.45 + index * 0.5), y, z + TILE_PITCH * (0.5 - index * 0.15)];
}
