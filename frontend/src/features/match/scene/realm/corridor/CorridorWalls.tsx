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

/** The near end stays open so the camera sees in. */
export function CorridorWalls({ realm, positions }: CorridorWallsProps) {
  return realm === "celestial" ? (
    <CelestialCloister positions={positions} />
  ) : (
    <InfernalPassage positions={positions} />
  );
}
