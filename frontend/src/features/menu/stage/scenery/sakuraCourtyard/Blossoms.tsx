"use client";

import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry, Color, NormalBlending } from "three";
import { seededRandom } from "@/game/domain/random";
import { useSoftDisc } from "../kit/matchAssets";

/** Clouds of blossom along the boughs: centre and half-size. */
const BLOSSOMS = [
  { at: [0.18, 1.14, -0.7], size: [0.22, 0.12, 0.16] },
  { at: [-0.12, 1.1, -0.74], size: [0.2, 0.11, 0.15] },
  { at: [-0.4, 0.96, -0.68], size: [0.16, 0.1, 0.14] },
  { at: [-1.02, 1.34, -0.24], size: [0.2, 0.13, 0.18] },
  { at: [-0.84, 1.2, -0.42], size: [0.16, 0.1, 0.14] },
  { at: [0.1, 1.52, -0.55], size: [0.24, 0.12, 0.18] },
  { at: [-0.2, 1.46, -0.46], size: [0.2, 0.12, 0.16] },
  { at: [-0.5, 1.3, -0.5], size: [0.18, 0.12, 0.16] },
  { at: [-1.1, 0.74, -0.92], size: [0.14, 0.09, 0.12] },
] as const;

const BLOSSOM_POINTS = 70;

/** Soft pink clouds of blossom: points scattered through each cluster, in a few shades. */
export function Blossoms() {
  const disc = useSoftDisc();
  const geometry = useMemo(() => {
    const random = seededRandom(37);
    const count = BLOSSOMS.length * BLOSSOM_POINTS;
    const positions = new Float32Array(count * 3);
    const colours = new Float32Array(count * 3);
    const shades = ["#ffd1e3", "#f9a8d4", "#f487b6", "#ffe4ef"].map((shade) => new Color(shade));
    let index = 0;
    for (const { at, size } of BLOSSOMS) {
      for (let point = 0; point < BLOSSOM_POINTS; point++) {
        // Denser towards each cloud's heart.
        const radius = Math.cbrt(random());
        const theta = random() * Math.PI * 2;
        const phi = Math.acos(2 * random() - 1);
        positions.set(
          [
            at[0] + Math.sin(phi) * Math.cos(theta) * radius * size[0],
            at[1] + Math.cos(phi) * radius * size[1],
            at[2] + Math.sin(phi) * Math.sin(theta) * radius * size[2],
          ],
          index * 3,
        );
        const shade = shades[Math.floor(random() * shades.length)];
        colours.set([shade.r, shade.g, shade.b], index * 3);
        index++;
      }
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(positions, 3));
    result.setAttribute("color", new BufferAttribute(colours, 3));
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        map={disc}
        size={0.075}
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={NormalBlending}
      />
    </points>
  );
}
