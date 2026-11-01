"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { LatheGeometry, Vector2, type Group } from "three";
import { TempleMaterials } from "./layout";

const BELL_FRAME = { x: 0.5, z: -0.62, turn: -0.45, width: 0.36, height: 0.82 };

/** Two lacquered posts under a small tiled roof, a bronze bell hanging between them, barely swinging. */
export function BellFrame({ materials }: { materials: TempleMaterials }) {
  const { x, z, turn, width, height } = BELL_FRAME;
  const bell = useMemo(
    () =>
      new LatheGeometry(
        [
          [0.0, 0.2],
          [0.035, 0.2],
          [0.05, 0.18],
          [0.055, 0.1],
          [0.068, 0.03],
          [0.08, 0.0],
          [0.074, 0.0],
        ].map(([px, py]) => new Vector2(px, py)),
        24,
      ),
    [],
  );
  useEffect(() => () => bell.dispose(), [bell]);
  const swing = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (swing.current) swing.current.rotation.z = 0.035 * Math.sin(clock.elapsedTime * 1.1);
  });

  return (
    <group position={[x, 0, z]} rotation-y={turn}>
      {[-1, 1].map((side) => (
        <group key={side} position-x={(side * width) / 2}>
          <mesh material={materials.stone} position-y={0.03}>
            <boxGeometry args={[0.07, 0.06, 0.07]} />
          </mesh>
          <mesh material={materials.wood} position-y={height / 2}>
            <boxGeometry args={[0.032, height, 0.032]} />
          </mesh>
        </group>
      ))}
      <mesh material={materials.wood} position-y={height - 0.04}>
        <boxGeometry args={[width + 0.08, 0.035, 0.04]} />
      </mesh>
      {/* The roof: two pitches meeting at a ridge, eaves turned up at the ends. */}
      {[-1, 1].map((side) => (
        <mesh key={side} material={materials.roof} position={[0, height + 0.03, side * 0.05]} rotation-x={side * 0.55}>
          <boxGeometry args={[width + 0.2, 0.014, 0.12]} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          material={materials.roof}
          position={[(side * (width + 0.2)) / 2, height + 0.05, 0]}
          rotation-z={side * -0.5}
        >
          <boxGeometry args={[0.05, 0.014, 0.16]} />
        </mesh>
      ))}
      <group ref={swing} position-y={height - 0.06}>
        <mesh material={materials.rope} position-y={-0.025}>
          <cylinderGeometry args={[0.004, 0.004, 0.05, 5]} />
        </mesh>
        <mesh geometry={bell} material={materials.bronze} position-y={-0.25} />
      </group>
    </group>
  );
}
