"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, type Mesh, type MeshBasicMaterial } from "three";
import { useRuneTexture } from "../shared/runeCircle";
import { useGlowColor } from "../shared/glowColor";

/** Just outside the player's own coloured ring at its feet (world units). */
const RADIUS = 1.0;
const GOLD = "#ffc94d";

/**
 * Themis's Mark of Justice on a marked player: a golden rune circle turning at their feet, out of the way of
 * anything floating over their head; each further mark turns it faster and brighter.
 */
export function JusticeMarkRing({ marks }: { marks: number }) {
  const runes = useRuneTexture();
  const glow = useGlowColor(GOLD, 1.4 + 0.3 * Math.min(marks, 4));
  const ring = useRef<Mesh>(null);
  const material = useRef<MeshBasicMaterial>(null);

  useFrame(({ clock }, delta) => {
    if (ring.current) ring.current.rotation.z += delta * (0.35 + 0.15 * marks);
    if (material.current) material.current.opacity = 0.7 + Math.sin(clock.elapsedTime * 2.4) * 0.15;
  });

  return (
    <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.03} renderOrder={2}>
      <planeGeometry args={[RADIUS * 2, RADIUS * 2]} />
      <meshBasicMaterial
        ref={material}
        map={runes}
        color={glow}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
