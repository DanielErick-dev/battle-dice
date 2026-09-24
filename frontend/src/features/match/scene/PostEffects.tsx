"use client";

import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { EffectsQuality } from "../config";

const SETTINGS = {
  high: { multisampling: 4, levels: 8, intensity: 1.15 },
  low: { multisampling: 0, levels: 5, intensity: 0.9 },
} as const;

/**
 * Screen effects. Bloom picks up anything brighter than 1.0 (neon trims, portals, fire,
 * the moon), so a material glows by pushing its colour or emissive past that.
 * Rendering goes through an offscreen buffer here, so tone mapping must be the last pass.
 */
export function PostEffects({ quality }: { quality: EffectsQuality }) {
  const settings = SETTINGS[quality];

  return (
    <EffectComposer multisampling={settings.multisampling}>
      <Bloom
        mipmapBlur
        luminanceThreshold={1}
        luminanceSmoothing={0.25}
        intensity={settings.intensity}
        radius={0.75}
        levels={settings.levels}
      />
      <Vignette offset={0.32} darkness={0.55} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
