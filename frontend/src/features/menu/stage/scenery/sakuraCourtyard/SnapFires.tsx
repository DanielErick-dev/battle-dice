"use client";

import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, MeshBasicMaterial, type Group, type Sprite } from "three";
import { FireRing, FlameCard, MATCH_FIGURE_HEIGHT, useAge, useSoftDisc } from "../kit/matchAssets";

/** The dropped papers, which catch first and burn tallest, as [x, z, width]. */
const PAPERS: readonly (readonly [number, number, number])[] = [
  [0.44, 0.3, 0.16],
  [0.36, -0.42, 0.17],
  [-0.5, 0.36, 0.14],
];
/** Fires over the rest of the paving, scattered round him on a golden-angle spiral (clear of where he stands). */
const SPREAD_FIRES: readonly (readonly [number, number, number])[] = Array.from({ length: 22 }, (_, index) => {
  const angle = index * 2.39996 + 0.4;
  const radius = 0.32 + 0.55 * Math.sqrt((index + 0.5) / 22);
  return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0.08 + ((index * 37) % 7) * 0.012] as const;
});
const FLOOR_FIRES = [...PAPERS, ...SPREAD_FIRES];
/** Seconds between the nearest and the farthest catching, and for each to flare up. */
const SPREAD_SECONDS = 0.6;
const FLARE_SECONDS = 0.35;
const SCORCH = new Color("#ff4a0a");

/**
 * Akane's snap sets the stage alight (`snapSeconds` into his intro; mounted fresh with each): a ring of fire sweeps
 * out over the courtyard, the dropped papers and the paving round him catch from the middle out and burn on (flaring
 * up first), the stone glowing under them and embers rising.
 */
export function SnapFires({ snapSeconds }: { snapSeconds: number }) {
  const since = useAge();
  const disc = useSoftDisc();
  const fires = useRef<(Group | null)[]>([]);
  const glows = useRef<(Sprite | null)[]>([]);
  const embers = useRef<Group>(null);
  const scorch = useMemo(
    () =>
      new MeshBasicMaterial({
        map: disc,
        color: new Color("#ff4a0a").multiplyScalar(0),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [disc],
  );
  useEffect(() => () => scorch.dispose(), [scorch]);
  const scorchRef = useRef(scorch);

  useFrame(({ clock }) => {
    const t = since(clock.elapsedTime) - snapSeconds;
    if (embers.current) embers.current.visible = t > 0;
    // The paving glows up as the fire takes, and smoulders on.
    const heat = Math.min(1, Math.max(0, t / (SPREAD_SECONDS + FLARE_SECONDS)));
    scorchRef.current.color.set(SCORCH).multiplyScalar(heat * (0.55 + 0.08 * Math.sin(clock.elapsedTime * 3.1)));
    FLOOR_FIRES.forEach(([x, z], index) => {
      const fire = fires.current[index];
      if (!fire) return;
      const lit = (t - (Math.hypot(x, z) / 0.9) * SPREAD_SECONDS) / FLARE_SECONDS;
      fire.visible = lit > 0;
      // Flares up big as it catches, then burns on lower.
      const size = lit <= 0 ? 0 : lit < 1 ? lit * 1.8 : 1 + 0.8 * Math.exp(-(lit - 1) * 0.8);
      fire.scale.setScalar(Math.max(0.001, size));
      const glow = glows.current[index];
      if (glow)
        glow.material.opacity = Math.min(1, Math.max(0, lit)) * (0.35 + 0.06 * Math.sin(clock.elapsedTime * 6 + index));
    });
  });

  return (
    <group>
      <group scale={1.7 / MATCH_FIGURE_HEIGHT}>
        <FireRing delay={snapSeconds} reach={2.2} flames={24} seconds={1} />
      </group>
      {/* Embers rising off the burning floor from the snap on. */}
      <group ref={embers} visible={false}>
        <Sparkles count={60} scale={[2, 1.4, 2]} position-y={0.7} size={3.5} speed={1.2} color="#ff8a3a" />
      </group>
      {FLOOR_FIRES.map(([x, z, width], index) => (
        <group key={index} position={[x, 0.01, z]}>
          <group
            ref={(node) => {
              fires.current[index] = node;
            }}
            visible={false}
          >
            <FlameCard width={width} seed={index * 3.7} glow={1.3} />
            <FlameCard width={width * 0.7} position={[width * 0.5, 0, width * 0.3]} seed={index * 3.7 + 2} />
            <FlameCard width={width * 0.6} position={[-width * 0.45, 0, -width * 0.2]} seed={index * 3.7 + 5} />
          </group>
          {/* The ground burning under it, flat on the paving. */}
          <mesh rotation-x={-Math.PI / 2} position-y={0.004} material={scorch}>
            <circleGeometry args={[width * 2.2, 20]} />
          </mesh>
          <sprite
            ref={(node) => {
              glows.current[index] = node;
            }}
            position-y={width * 0.6}
            scale={width * 7}
          >
            <spriteMaterial
              map={disc}
              color="#ff6a1a"
              transparent
              opacity={0}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </sprite>
        </group>
      ))}
    </group>
  );
}
