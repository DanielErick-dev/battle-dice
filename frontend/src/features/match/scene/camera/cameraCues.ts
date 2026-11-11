import type { Board } from "@/game/domain/types";
import type { BoardLayout } from "@/features/shared/board/boardLayout";
import { fireTrack } from "@/features/characters/akane/fireTrack";
import { wraithTrack } from "@/features/characters/zarek/wraithTrack";
import { FIRE_BOLT_SECONDS, FIRE_RACE_STEP } from "@/features/shared/config";
import type { MatchView, TileEffectKind } from "../../model/matchView";
import { pathDirection, tokenTarget } from "../token/tokenPlacement";
import { spotlightOf } from "./spotlight";
import type { CameraChase, CameraSpotlight } from "./types";

const VOID_EFFECTS: readonly (TileEffectKind | undefined)[] = [
  "voidSwallowed",
  "riftOpened",
  "voidCast",
  "voidSeized",
  "voidEchoed",
];

/** While the Void works on a tile (swallowing, opening, setting down, taking), the camera rides along with it. */
export function voidChase(view: MatchView): CameraChase | null {
  const rift = view.fx.voidRift;
  return rift && VOID_EFFECTS.includes(view.effect?.kind) ? { key: rift.id, position: wraithTrack.position } : null;
}

/** Akane's Fire Zone: the camera rides along with the fire as it races down the tiles. */
export function fireChase(view: MatchView): CameraChase | null {
  const blaze = view.fx.blaze;
  return blaze?.kind === "lob" && view.effect?.kind === "scarletLit"
    ? {
        key: 10_000 + blaze.id,
        position: fireTrack.position,
        seconds: FIRE_BOLT_SECONDS + blaze.tiles.length * FIRE_RACE_STEP + 0.3,
      }
    : null;
}

/** The move being filmed from the front, placed where its figure stands and facing the way it does. */
export function cameraSpotlight(view: MatchView, board: Board, layout: BoardLayout): CameraSpotlight | null {
  const shot = spotlightOf(view);
  const player = shot && view.players.find((candidate) => candidate.id === shot.playerId);
  if (!shot || !player) return null;
  return {
    ...shot,
    position: tokenTarget(player, view, board, layout),
    facing: pathDirection(board, layout, player.position),
  };
}
