"use client";

import type { RealmKind } from "@/game/domain/types";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { CelestialCloister } from "./CelestialCloister";
import { InfernalPassage } from "./InfernalPassage";

interface CorridorWallsProps {
  realm: RealmKind;
  /** The track's tiles, far to near, all on one line (see corridorPositions). */
  positions: readonly Vec3[];
}

/**
 * What closes a realm track into a corridor, laid out in world space on the tiles' level; the near
 * end, towards the camera, stays open. Hell is a tight passage of basalt (InfernalPassage), heaven an
 * open cloister of white marble (CelestialCloister).
 */
export function CorridorWalls({ realm, positions }: CorridorWallsProps) {
  return realm === "celestial" ? (
    <CelestialCloister positions={positions} />
  ) : (
    <InfernalPassage positions={positions} />
  );
}
