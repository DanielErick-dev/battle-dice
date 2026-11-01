"use client";

import { ARROW_LENGTH } from "./layout";
import { Prop, usePropMesh } from "../kit/matchAssets";

/** The target she practises on, turned towards the middle; `height` is the whole easel's. */
const TARGET = { x: 0.58, z: -0.4, turn: -0.6, height: 0.55 };

/** Arrows in the target's face: offset on it and slant. */
const TARGET_ARROWS = [
  { x: 0.02, y: 0.03, tilt: [0.08, -0.1] },
  { x: -0.06, y: -0.04, tilt: [-0.05, 0.12] },
];

/** Her target on its easel (PROPS.archerTarget), with a couple of her arrows in it. */
export function Target({ arrow }: { arrow: ReturnType<typeof usePropMesh> }) {
  const target = usePropMesh("archerTarget");
  const { x, z, turn, height } = TARGET;
  return (
    <group position={[x, 0, z]} rotation-y={turn}>
      <Prop geometry={target.geometry} material={target.material} height={height} standing />
      {/* On the face: its middle at about two thirds up, leaning back a little. */}
      <group position={[0, height * 0.68, height * 0.2]} rotation-x={-0.18}>
        {TARGET_ARROWS.map(({ x: ax, y, tilt }) => (
          <group
            key={`${ax}:${y}`}
            position={[ax, y, ARROW_LENGTH / 2 - 0.05]}
            rotation={[-Math.PI / 2 + tilt[0], 0, tilt[1]]}
          >
            <Prop geometry={arrow.geometry} material={arrow.material} height={ARROW_LENGTH} />
          </group>
        ))}
      </group>
    </group>
  );
}
