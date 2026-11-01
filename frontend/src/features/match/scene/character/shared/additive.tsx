"use client";

import type { ThreeElements } from "@react-three/fiber";
import { useMemo } from "react";
import { AdditiveBlending, DoubleSide, MeshBasicMaterial, type Color, type MeshBasicMaterialParameters } from "three";
import { useDisposable } from "./disposal";

/**
 * Additive glow, the look of every light effect: it adds onto what's behind, never hides it, and
 * skips tone mapping so colours pushed past 1.0 bloom. No real lights (they'd recompile the scene).
 */
const ADDITIVE = { transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false } as const;

export function additiveMaterial(parameters: MeshBasicMaterialParameters = {}): MeshBasicMaterial {
  return new MeshBasicMaterial({ ...ADDITIVE, ...parameters });
}

/** `<meshBasicMaterial>` with the additive glow settings; any prop (a ref, `opacity`, `side`…) passes through. */
export function AdditiveMaterial(props: ThreeElements["meshBasicMaterial"]) {
  return <meshBasicMaterial {...ADDITIVE} {...props} />;
}

/** `<pointsMaterial>` with the additive glow settings, for sparks and motes. */
export function AdditivePointsMaterial(props: ThreeElements["pointsMaterial"]) {
  return <pointsMaterial {...ADDITIVE} {...props} />;
}

/**
 * A two-sided additive material in `glow`, shared by many meshes and faded with `setValues({ opacity })`.
 * With `vertexColors`, the geometry's colours shade it (black: nothing shows).
 */
export function useGlowMaterial(glow: Color, vertexColors = false): MeshBasicMaterial {
  return useDisposable(
    useMemo(() => additiveMaterial({ color: glow, vertexColors, side: DoubleSide }), [glow, vertexColors]),
  );
}
