"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, LatheGeometry, MeshBasicMaterial, SpriteMaterial, Vector2, type Mesh } from "three";
import { TempleMaterials } from "./layout";
import { useSoftDisc } from "../kit/matchAssets";

const BURNER = { x: -0.5, z: -0.48 };

const PUFFS = 10;

const SMOKE_RISE = 1.1;

/** A round stone censer on three feet with incense burning, its smoke curling up and away. */
export function Censer({ materials }: { materials: TempleMaterials }) {
  const disc = useSoftDisc();
  const bowl = useMemo(
    () =>
      new LatheGeometry(
        [
          [0, 0],
          [0.05, 0.004],
          [0.085, 0.03],
          [0.095, 0.07],
          [0.088, 0.09],
          [0.08, 0.088],
          [0.07, 0.075],
        ].map(([x, y]) => new Vector2(x, y)),
        20,
      ),
    [],
  );
  useEffect(() => () => bowl.dispose(), [bowl]);
  const glow = useMemo(
    () => ({
      ember: new SpriteMaterial({
        map: disc,
        color: new Color("#ff7a2e").multiplyScalar(2),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      smoke: Array.from(
        { length: PUFFS },
        () => new MeshBasicMaterial({ map: disc, color: "#d8d2c8", transparent: true, depthWrite: false }),
      ),
    }),
    [disc],
  );
  useEffect(() => () => [glow.ember, ...glow.smoke].forEach((material) => material.dispose()), [glow]);
  const puffs = useRef<(Mesh | null)[]>([]);
  const sticks = [-0.012, 0.006, 0.018];

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    puffs.current.forEach((puff, index) => {
      if (!puff) return;
      const age = ((t * 0.16 + index / PUFFS) % 1) * SMOKE_RISE;
      const rise = age / SMOKE_RISE;
      // Curls as it climbs and drifts off to the side the wind takes it.
      puff.position.set(
        Math.sin(t * 0.8 + index * 1.3) * 0.03 * rise * 4 + rise * 0.12,
        0.26 + age,
        Math.cos(t * 0.6 + index) * 0.02 * rise * 4,
      );
      puff.scale.setScalar(0.05 + rise * 0.28);
      puff.quaternion.copy(camera.quaternion);
      glow.smoke[index].setValues({ opacity: 0.32 * Math.min(1, rise * 6) * (1 - rise) });
    });
  });

  return (
    <group position={[BURNER.x, 0, BURNER.z]}>
      <mesh material={materials.stone} position-y={0.03}>
        <boxGeometry args={[0.22, 0.06, 0.22]} />
      </mesh>
      {[0, 1, 2].map((foot) => {
        const angle = (foot / 3) * Math.PI * 2 + 0.3;
        return (
          <mesh
            key={foot}
            material={materials.bronze}
            position={[Math.cos(angle) * 0.055, 0.075, Math.sin(angle) * 0.055]}
          >
            <cylinderGeometry args={[0.012, 0.016, 0.03, 8]} />
          </mesh>
        );
      })}
      <group position-y={0.088}>
        <mesh geometry={bowl} material={materials.stone} />
        {/* Handles on either side. */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            material={materials.bronze}
            position-x={side * 0.1}
            position-y={0.07}
            rotation-y={Math.PI / 2}
          >
            <torusGeometry args={[0.018, 0.005, 6, 12, Math.PI]} />
          </mesh>
        ))}
        <mesh material={materials.ash} position-y={0.072} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.07, 20]} />
        </mesh>
        {sticks.map((x, index) => (
          <group key={x} position={[x, 0.072, (index - 1) * 0.01]} rotation-z={(index - 1) * 0.15}>
            <mesh material={materials.wood} position-y={0.05}>
              <cylinderGeometry args={[0.0018, 0.0018, 0.1, 4]} />
            </mesh>
            <sprite material={glow.ember} position-y={0.1} scale={0.018} />
          </group>
        ))}
      </group>
      {glow.smoke.map((material, index) => (
        <mesh key={index} ref={(mesh) => void (puffs.current[index] = mesh)} material={material} renderOrder={3}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  );
}
