"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { useCanvasTexture } from "../kit/textures";
import { CYAN, LILAC } from "./layout";
import { paintStar } from "./textures";

const SPARKLES = 64;

const SPARKLE_HEIGHT = 2;

/** Four-pointed glints rising slowly round her in a lazy spiral, twinkling (additive, so dark ones vanish). */
export function Sparkles() {
  const star = useCanvasTexture({ size: 64, draw: paintStar, linear: true });
  const { geometry, sparks } = useMemo(() => {
    const random = seededRandom(101);
    const sparks = Array.from({ length: SPARKLES }, () => ({
      angle: random() * Math.PI * 2,
      radius: 0.3 + random() * 0.5,
      height: random() * SPARKLE_HEIGHT,
      speed: 0.06 + random() * 0.1,
      spin: (0.1 + random() * 0.2) * (random() < 0.5 ? 1 : -1),
      phase: random() * Math.PI * 2,
      tint: random() < 0.3 ? LILAC : CYAN,
    }));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(SPARKLES * 3), 3));
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(SPARKLES * 3), 3));
    return { geometry, sparks };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const colors = geometry.getAttribute("color") as BufferAttribute;
    sparks.forEach((spark, index) => {
      spark.height += spark.speed * delta;
      if (spark.height > SPARKLE_HEIGHT) spark.height -= SPARKLE_HEIGHT;
      const at = spark.angle + t * spark.spin;
      // Kept inside the stage's sides, where the canvas would spill over the page.
      const x = Math.max(-0.8, Math.min(0.8, Math.cos(at) * spark.radius));
      positions.setXYZ(index, x, spark.height, Math.sin(at) * spark.radius);
      const fade = Math.min(1, spark.height * 3, (SPARKLE_HEIGHT - spark.height) * 2);
      const glint = fade * (0.25 + 0.75 * Math.max(0, Math.sin(t * 2.3 + spark.phase)) ** 4) * 1.6;
      // Whitened at the heart so the tint reads as a glint, not a coloured dot.
      colors.setXYZ(index, (0.6 + spark.tint.r) * glint, (0.6 + spark.tint.g) * glint, (0.6 + spark.tint.b) * glint);
    });
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        map={star}
        vertexColors
        size={0.07}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
