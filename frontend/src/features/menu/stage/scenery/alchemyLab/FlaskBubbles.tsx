"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { BENCH_TOP, FLASKS } from "./layout";
import { useSoftDisc } from "../kit/matchAssets";

const BUBBLES_PER_FLASK = 6;

/** Bubbles rising through each flask on the bench, in the bench's own space. */
export function FlaskBubbles() {
  const disc = useSoftDisc();
  const { geometry, bubbles } = useMemo(() => {
    const random = seededRandom(57);
    const bubbles = FLASKS.flatMap((flask) => {
      // From near the bottom up to the liquid's surface.
      const top =
        flask.kind === "round" ? flask.size * 1.1 : flask.kind === "cone" ? flask.size * 0.68 : flask.size * 3.9;
      const spread = (flask.kind === "tall" ? 0.5 : 0.45) * flask.size;
      return Array.from({ length: BUBBLES_PER_FLASK }, () => ({
        x: flask.x + (random() - 0.5) * spread,
        z: flask.z + (random() - 0.5) * spread,
        bottom: BENCH_TOP + flask.size * 0.25,
        top: BENCH_TOP + top,
        speed: 0.6 + random() * 0.9,
        phase: random(),
      }));
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(bubbles.length * 3), 3));
    return { geometry, bubbles };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const t = clock.elapsedTime;
    bubbles.forEach(({ x, z, bottom, top, speed, phase }, index) => {
      const life = (t * speed * 0.6 + phase) % 1;
      positions.setXYZ(index, x + Math.sin(t * 6 + phase * 9) * 0.002, bottom + (top - bottom) * life, z);
    });
    positions.needsUpdate = true;
  });

  return (
    <points geometry={geometry} renderOrder={3}>
      <pointsMaterial
        map={disc}
        color={new Color("#d8ffe9").multiplyScalar(1.4)}
        size={0.014}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
