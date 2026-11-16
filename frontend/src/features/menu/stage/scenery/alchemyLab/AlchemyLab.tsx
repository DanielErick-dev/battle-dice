"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, SpriteMaterial, type PointLight, type Sprite } from "three";
import { preloadProps, useFittedProp, useSoftDisc } from "../kit/matchAssets";

preloadProps(["alchemyCircle", "alchemyCounter", "alchemySanctuary", "alchemyCauldron"]);

/** The Meshy ritual circle: its raised middle sunk level with the floor she stands on, its standing rim around her. */
const CIRCLE = { diameter: 2.7, platform: 0.24 / 1.12 };
/** The Meshy counter at her left, turned to face her. */
const COUNTER = { x: -0.8, z: 0.22, turn: Math.PI / 2 - 0.25, width: 0.99 };
/** The alchemist's sanctuary behind her, and the cauldron at her right. */
const SANCTUARY = { x: -0.45, z: -0.85, turn: 0.35, height: 1.25 };
const CAULDRON = { x: 0.95, z: -0.3, turn: -0.6, height: 0.62 };
const BREW = new Color("#3dff9a");
/** Bubbles of glow rising off the brew: how many and how long each takes. */
const BUBBLES = 7;
const BUBBLE_SECONDS = 1.8;

/** The Emerald Alchemist's stage: a ritual circle, her counter, her sanctuary and a bubbling cauldron. */
export function AlchemyLab() {
  const circle = useFittedProp("alchemyCircle");
  const counter = useFittedProp("alchemyCounter");
  const sanctuary = useFittedProp("alchemySanctuary");
  const cauldron = useFittedProp("alchemyCauldron");
  const disc = useSoftDisc();
  const circleScale = CIRCLE.diameter / Math.max(circle.size[0], circle.size[2]);
  const counterScale = COUNTER.width / counter.size[0];
  // One each: every bubble fades on its own.
  const glows = useMemo(
    () =>
      Array.from(
        { length: BUBBLES },
        () =>
          new SpriteMaterial({
            map: disc,
            color: BREW.clone().multiplyScalar(1.6),
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
            toneMapped: false,
          }),
      ),
    [disc],
  );
  useEffect(() => () => glows.forEach((material) => material.dispose()), [glows]);
  const bubbles = useRef<(Sprite | null)[]>([]);
  const light = useRef<PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (light.current) light.current.intensity = 1.6 + 0.4 * Math.sin(t * 3.1) + 0.2 * Math.sin(t * 7.3);
    bubbles.current.forEach((bubble, index) => {
      if (!bubble) return;
      const progress = (t / BUBBLE_SECONDS + index / BUBBLES) % 1;
      const angle = index * 2.4;
      bubble.position.set(Math.cos(angle) * 0.12, CAULDRON.height * 0.85 + progress * 0.35, Math.sin(angle) * 0.12);
      bubble.scale.setScalar(0.07 * (1 - progress) + 0.02);
      bubble.material.opacity = 1 - progress;
    });
  });

  return (
    <group>
      <mesh
        geometry={circle.geometry}
        material={circle.material}
        position-y={-CIRCLE.platform * circleScale + 0.004}
        scale={circleScale}
        receiveShadow
      />
      <mesh
        geometry={counter.geometry}
        material={counter.material}
        position={[COUNTER.x, 0, COUNTER.z]}
        rotation-y={COUNTER.turn}
        scale={counterScale}
        castShadow
      />
      <mesh
        geometry={sanctuary.geometry}
        material={sanctuary.material}
        position={[SANCTUARY.x, 0, SANCTUARY.z]}
        rotation-y={SANCTUARY.turn}
        scale={SANCTUARY.height}
        castShadow
      />
      <group position={[CAULDRON.x, 0, CAULDRON.z]} rotation-y={CAULDRON.turn}>
        <mesh geometry={cauldron.geometry} material={cauldron.material} scale={CAULDRON.height} castShadow />
        <pointLight ref={light} position-y={CAULDRON.height * 1.1} color={BREW} distance={1.6} decay={1.6} />
        {glows.map((material, index) => (
          <sprite key={index} ref={(sprite) => void (bubbles.current[index] = sprite)} material={material} />
        ))}
      </group>
    </group>
  );
}
