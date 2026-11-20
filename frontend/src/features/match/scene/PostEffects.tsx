"use client";

import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { QualityStep } from "./quality";

/** Bloom picks up anything brighter than 1.0; tone mapping must be the last pass since this renders offscreen. */
export function PostEffects({ step }: { step: QualityStep }) {
  return (
    <EffectComposer multisampling={step.multisampling}>
      <Bloom
        mipmapBlur
        luminanceThreshold={1}
        luminanceSmoothing={0.25}
        intensity={step.bloomIntensity}
        radius={0.75}
        levels={step.bloomLevels}
      />
      <Vignette offset={0.32} darkness={0.55} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
