"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { seededRandom } from "@/game/domain/core/random";
import { useDisposal } from "../kit/dispose";
import { GlowPoints, pointBuffers } from "../kit/GlowPoints";
import { useSoftDisc } from "../kit/matchAssets";
import { spike } from "../kit/motion";
import { shoreline } from "./shoreline";

const GLINTS = 46;

/** Moonlight glittering on the shallows: points that twinkle in and out, thickest along a path. */
export function MoonGlints() {
  const disc = useSoftDisc();
  const glints = useMemo(() => {
    const random = seededRandom(41);
    return Array.from({ length: GLINTS }, () => {
      const x = (random() - 0.5) * 1.3 * (random() < 0.6 ? 0.35 : 1) + 0.12;
      const shore = shoreline(x) - 0.04;
      const z = shore - random() * (Math.sqrt(Math.max(0, 0.9 - x * x)) + shore);
      return { x, z, rate: 1.5 + random() * 3, phase: random() * Math.PI * 2 };
    });
  }, []);
  const geometry = useMemo(
    () => pointBuffers(GLINTS, true, new Float32Array(glints.flatMap(({ x, z }) => [x, 0.016, z]))),
    [glints],
  );
  useDisposal(geometry);

  useFrame(({ clock }) => {
    const colors = geometry.getAttribute("color");
    const t = clock.elapsedTime;
    glints.forEach(({ rate, phase }, index) => {
      // Sharpened so each glint flashes briefly instead of glowing steadily.
      const flash = spike(t, rate, phase, 6);
      colors.setXYZ(index, flash * 0.75, flash * 0.85, flash);
    });
    colors.needsUpdate = true;
  });

  return <GlowPoints geometry={geometry} map={disc} size={0.045} colour="vertex" renderOrder={3} />;
}
