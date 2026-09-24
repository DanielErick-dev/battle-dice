"use client";

import { Stars } from "@react-three/drei";
import type { BoardLayout } from "../boardLayout";
import { ArenaBase } from "./ArenaBase";
import { Brazier } from "./Brazier";
import { Ocean } from "./Ocean";
import { RockSpires } from "./RockSpires";
import { SkyDome } from "./SkyDome";

/** Colour where sky meets sea; the scene fog uses it too so the water fades into the horizon. */
export const HORIZON_COLOR = "#1b1236";
const ZENITH_COLOR = "#03040b";

const WATER_LEVEL = -1.05;
/** Top of the lower arena tier; the upper slab under the tiles rests on it. */
const LOWER_TIER_TOP = -0.6;
const LOWER_TIER_HEIGHT = 2.2;
const BRAZIER_INSET = 0.75;

interface ArenaEnvironmentProps {
  layout: BoardLayout;
  /** Board size relative to the training board (see boardScaleFor). */
  scale: number;
}

/** Everything around the tiles: stone arena, braziers, night sea, rock spires, sky and moon. */
export function ArenaEnvironment({ layout, scale }: ArenaEnvironmentProps) {
  const skyRadius = 95 * scale;
  const moonPosition: [number, number, number] = [-0.3 * skyRadius, 0.28 * skyRadius, -0.8 * skyRadius];
  const lowerHalfWidth = (layout.width + 3.6) / 2;
  const lowerHalfDepth = (layout.depth + 3.6) / 2;
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];

  return (
    <group>
      <SkyDome
        radius={skyRadius}
        horizon={HORIZON_COLOR}
        zenith={ZENITH_COLOR}
        moonPosition={moonPosition}
        moonRadius={4 * scale}
      />
      <Stars radius={70 * scale} depth={40} count={2500} factor={3.5} fade speed={0.4} />

      <Ocean
        level={WATER_LEVEL}
        size={skyRadius * 1.9}
        shoreHalfSize={[lowerHalfWidth, lowerHalfDepth]}
        moonPosition={moonPosition}
      />
      <RockSpires
        innerRadius={Math.max(lowerHalfWidth, lowerHalfDepth) + 7}
        outerRadius={45 * scale}
        level={WATER_LEVEL}
        count={18}
      />

      <ArenaBase width={layout.width} depth={layout.depth} lowerTop={LOWER_TIER_TOP} lowerHeight={LOWER_TIER_HEIGHT} />
      {corners.map(([sx, sz], i) => (
        <Brazier
          key={i}
          seed={i}
          position={[sx * (lowerHalfWidth - BRAZIER_INSET), LOWER_TIER_TOP, sz * (lowerHalfDepth - BRAZIER_INSET)]}
        />
      ))}
    </group>
  );
}
