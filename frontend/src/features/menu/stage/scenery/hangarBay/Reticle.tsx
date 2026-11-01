"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, MeshBasicMaterial, type Group } from "three";
import { useCanvasTexture } from "../kit/textures";
import { LOCKED } from "./layout";
import { RETICLE_BRACKETS, RETICLE_RING } from "./textures";

const TARGET = new Color("#7fe6ff");

/** The reticle on the floor ahead of him; a lock-on cycle of `RETICLE_CYCLE` seconds, locked for the last second. */
const RETICLE_Z = 0.64;

const RETICLE_RADIUS = 0.2;

const RETICLE_CYCLE = 4;

/** A hologram reticle on the floor: its outer ring turning, brackets closing in, then flashing red when locked. */
export function Reticle() {
  const ring = useCanvasTexture(RETICLE_RING);
  const brackets = useCanvasTexture(RETICLE_BRACKETS);
  const materials = useMemo(
    () =>
      [ring, brackets].map(
        (map) =>
          new MeshBasicMaterial({
            map,
            color: TARGET,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [ring, brackets],
  );
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const cycle = (t % RETICLE_CYCLE) / (RETICLE_CYCLE - 1);
    const locked = cycle >= 1;
    if (outer.current) outer.current.rotation.z = t * 0.5;
    if (inner.current) {
      inner.current.rotation.z = locked ? Math.PI / 4 : -t * 1.2;
      inner.current.scale.setScalar(locked ? 0.82 : 1.5 - 0.68 * cycle ** 2);
    }
    const blink = locked && Math.sin(t * 30) > 0;
    materials.forEach((material) => {
      material.color.copy(locked ? LOCKED : TARGET).multiplyScalar(blink ? 2.2 : 1.3);
    });
  });

  return (
    <group position={[0, 0.006, RETICLE_Z]} rotation-x={-Math.PI / 2}>
      <group ref={outer}>
        <mesh material={materials[0]} renderOrder={2}>
          <planeGeometry args={[RETICLE_RADIUS * 2, RETICLE_RADIUS * 2]} />
        </mesh>
      </group>
      <group ref={inner}>
        <mesh material={materials[1]} renderOrder={2}>
          <planeGeometry args={[RETICLE_RADIUS * 1.2, RETICLE_RADIUS * 1.2]} />
        </mesh>
      </group>
    </group>
  );
}
