"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import { AdditiveBlending, Color, type Group, type MeshBasicMaterial } from "three";
import type { CharacterClip } from "../../characters";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../boardLayout";
import { useAge } from "../useAge";
import { CharacterModel } from "./CharacterModel";
import { FIGURE_HEIGHT } from "./figure";

/** How high the owner's view of it hovers over its tile, how much it sways, and how fast it rises in. */
const HOVER = 0.25;
const SWAY = 0.12;
const APPEAR_SECONDS = 0.8;

interface SpecterFigureProps {
  model: string;
  position: Vec3;
  color: string;
  /**
   * Seen by someone other than its Warden: an exact double of the Warden standing on the tile,
   * ring and all, so nobody can tell the apparitions from the real one.
   */
  disguised: boolean;
  /** Which way a figure resting on this tile faces (along the path), radians round the vertical. */
  facing: number;
  /** For the Warden's own eyes: which apparition this is. */
  label?: string;
}

/**
 * A Shadow Warden's apparition on its tile. Its Warden sees it for what it is: a see-through
 * shadow of themselves glowing at the edges, hovering and swaying over a pool of darkness, named.
 * Everyone else sees the Warden standing there, exactly as the real one stands.
 */
export function SpecterFigure({ model, position, color, disguised, facing, label }: SpecterFigureProps) {
  const clip = useRef<CharacterClip>("idle");
  const body = useRef<Group>(null);
  const pool = useRef<MeshBasicMaterial>(null);
  const glow = useMemo(() => new Color(color).multiplyScalar(1.4), [color]);
  const age = useAge();
  const phase = useMemo(() => position[0] * 1.3 + position[2] * 2.1, [position]);

  useFrame(({ clock }) => {
    if (disguised) return;
    const t = age(clock.elapsedTime);
    const rise = Math.min(1, t / APPEAR_SECONDS);
    if (body.current) {
      body.current.position.y =
        -FIGURE_HEIGHT * (1 - rise) ** 2 + HOVER + Math.sin(clock.elapsedTime * 1.4 + phase) * 0.08;
      body.current.position.x = Math.sin(clock.elapsedTime * 0.9 + phase) * SWAY;
      body.current.rotation.y = facing + Math.sin(clock.elapsedTime * 0.5 + phase) * 0.6;
    }
    if (pool.current) pool.current.opacity = (0.55 + 0.2 * Math.sin(clock.elapsedTime * 2 + phase)) * rise;
  });

  return (
    <group position={[position[0], position[1] + TILE_HEIGHT / 2, position[2]]}>
      {disguised ? (
        // The same ring as a player's token (see PlayerToken), at rest.
        <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
          <ringGeometry args={[0.62, 0.75, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.35} toneMapped={false} />
        </mesh>
      ) : (
        <>
          <mesh rotation-x={-Math.PI / 2} position-y={0.03}>
            <circleGeometry args={[TILE_SIZE * 0.42, 40]} />
            <meshBasicMaterial ref={pool} color="#05040a" transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={0.04}>
            <ringGeometry args={[TILE_SIZE * 0.4, TILE_SIZE * 0.45, 40]} />
            <meshBasicMaterial
              color={glow}
              transparent
              opacity={0.5}
              depthWrite={false}
              blending={AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </>
      )}
      <group ref={body} rotation-y={facing}>
        <Suspense fallback={null}>
          <CharacterModel url={model} height={FIGURE_HEIGHT} clip={clip} ghost={disguised ? undefined : color} />
        </Suspense>
      </group>
      {label && !disguised && (
        <Html center position={[0, FIGURE_HEIGHT + HOVER + 0.5, 0]} zIndexRange={[10, 0]}>
          <span className="pointer-events-none rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-black tracking-wider whitespace-nowrap text-sky-200 uppercase ring-1 ring-sky-300/50">
            {label}
          </span>
        </Html>
      )}
    </group>
  );
}
