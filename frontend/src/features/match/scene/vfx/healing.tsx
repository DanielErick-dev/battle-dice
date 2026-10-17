"use client";

import { AppearanceMode, RenderMode, VFXEmitter, VFXParticles } from "wawa-vfx";
import type { VFXEmitterSettings, VFXParticlesSettings } from "wawa-vfx";

/** The particle pool the healing emitters feed (wawa-vfx pairs them by name). */
const HEALING = "healing";

const PARTICLES: VFXParticlesSettings = {
  nbParticles: 2000,
  renderMode: RenderMode.Billboard,
  appearance: AppearanceMode.Circular,
  intensity: 2,
  fadeSize: [0.2, 0.8],
  fadeAlpha: [0.2, 0.8],
  // The pool sits at the world's origin while its motes rise wherever the emitters are: culled by
  // the origin's bounds, it would vanish whenever the origin is off screen.
  frustumCulled: false,
};

/** Green motes rising round the figure (world units: emitted from the emitter's world position). */
const HEALING_EMITTER: VFXEmitterSettings = {
  loop: true,
  duration: 1,
  nbParticles: 50,
  spawnMode: "time",
  particlesLifetime: [1.2, 2.2],
  startPositionMin: [-0.8, 0, -0.8],
  startPositionMax: [0.8, 0.6, 0.8],
  directionMin: [0, 1, 0],
  directionMax: [0, 1, 0],
  size: [0.05, 0.12],
  speed: [0.6, 1.2],
  colorStart: ["#86efac", "#bbf7d0"],
  colorEnd: ["#10b981"],
};

/**
 * The pool of healing motes. Particles live in world space, so it's mounted once at the root of the
 * scene, not inside a moving token; HealingEmitter feeds it from wherever it stands.
 */
export function HealingParticles() {
  return <VFXParticles name={HEALING} settings={PARTICLES} />;
}

/** Sends up healing motes from where it stands: `seconds` of them, or for as long as it's mounted. */
export function HealingEmitter({ seconds, debug }: { seconds?: number; debug?: boolean }) {
  const settings =
    seconds === undefined
      ? HEALING_EMITTER
      : {
          ...HEALING_EMITTER,
          loop: false,
          duration: seconds,
          nbParticles: Math.round(50 * seconds),
        };
  return <VFXEmitter debug={debug} emitter={HEALING} settings={settings} />;
}
