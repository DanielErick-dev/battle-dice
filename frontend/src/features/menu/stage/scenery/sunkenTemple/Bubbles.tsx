"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { useCanvasTexture } from "../kit/textures";
import { BUBBLE } from "./textures";

const BUBBLES = 40;

const BUBBLE_HEIGHT = 1.9;

/** Where bubbles rise from: the corals' feet, the chest and cracks between the tiles. */
const VENTS = [
  [-0.7, -0.55],
  [0.78, -0.72],
  [0.55, -0.38],
  [-0.2, -0.75],
  [0.3, -0.3],
  [-0.5, 0.05],
] as const;

export function Bubbles() {
  const ring = useCanvasTexture(BUBBLE);
  const { geometry, bubbles } = useMemo(() => {
    const random = seededRandom(61);
    const bubbles = Array.from({ length: BUBBLES }, () => {
      const [x, z] = VENTS[Math.floor(random() * VENTS.length)];
      return {
        x: x + (random() - 0.5) * 0.06,
        z: z + (random() - 0.5) * 0.06,
        height: random() * BUBBLE_HEIGHT,
        speed: 0.18 + random() * 0.22,
        phase: random() * Math.PI * 2,
      };
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(BUBBLES * 3), 3));
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(BUBBLES * 3), 3));
    return { geometry, bubbles };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }, delta) => {
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const colors = geometry.getAttribute("color") as BufferAttribute;
    const t = clock.elapsedTime;
    bubbles.forEach((bubble, index) => {
      // Faster as they climb, like real bubbles growing on the way up.
      bubble.height += bubble.speed * delta * (1 + bubble.height * 0.4);
      if (bubble.height > BUBBLE_HEIGHT) bubble.height -= BUBBLE_HEIGHT;
      const wobble = Math.sin(t * 5 + bubble.phase) * 0.012 * (1 + bubble.height);
      positions.setXYZ(index, bubble.x + wobble, bubble.height, bubble.z + Math.cos(t * 4 + bubble.phase) * 0.008);
      const fade = Math.min(1, (BUBBLE_HEIGHT - bubble.height) * 2, bubble.height * 8) * 0.8;
      colors.setXYZ(index, fade * 0.8, fade, fade);
    });
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        map={ring}
        size={0.04}
        vertexColors
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
