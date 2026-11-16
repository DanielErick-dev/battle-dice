"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, MeshBasicMaterial, type Group } from "three";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { useSoftDisc } from "@/features/characters/shared/softDisc";

/**
 * Where Zarek's Void Apex keeps those it swallowed, out at sea: a black pool with violet swirls turning over it.
 * Stands in until there's a model of the Void itself.
 */
export function VoidPocket({ position, radius }: { position: Vec3; radius: number }) {
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      core: new MeshBasicMaterial({ map: disc, color: "#000000", transparent: true, depthWrite: false }),
      swirl: [0.9, 0.6].map(
        (opacity) =>
          new MeshBasicMaterial({
            map: disc,
            color: "#8b2cf5",
            opacity,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
            toneMapped: false,
          }),
      ),
    }),
    [disc],
  );
  useEffect(
    () => () => {
      materials.core.dispose();
      materials.swirl.forEach((material) => material.dispose());
    },
    [materials],
  );
  const swirls = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    swirls.current.forEach((swirl, index) => {
      if (swirl) swirl.rotation.y = clock.elapsedTime * (index === 0 ? 0.6 : -0.9);
    });
  });

  return (
    <group position={position}>
      <mesh material={materials.core} rotation-x={-Math.PI / 2} position-y={0.02} scale={radius * 2.6}>
        <planeGeometry />
      </mesh>
      {materials.swirl.map((material, index) => (
        <group key={index} ref={(group) => void (swirls.current[index] = group)} position-y={0.04 + index * 0.02}>
          {/* Two lopsided blots per layer, so its turning reads as a swirl. */}
          {[0, Math.PI].map((angle) => (
            <mesh
              key={angle}
              material={material}
              rotation-x={-Math.PI / 2}
              position={[Math.cos(angle) * radius * 0.45, 0, Math.sin(angle) * radius * 0.45]}
              scale={[radius * 1.6, radius * 0.7, 1]}
            >
              <planeGeometry />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
