"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import type { Material, Mesh, MeshStandardMaterial, Object3D } from "three";
import { driveEnergy, energize } from "@/features/shared/three/energize";
import { useAge } from "@/features/shared/three/useAge";

interface Swap {
  mesh: Mesh;
  original: Material | Material[];
  energy: ReturnType<typeof energize>;
}

/** Puts the energized copies on her meshes, or (`on` false) her own materials back and the copies away. */
function wear(swaps: readonly Swap[], on: boolean): void {
  for (const { mesh, original, energy } of swaps) {
    mesh.material = on ? energy.material : original;
    if (!on) energy.material.dispose();
  }
}

/** Seconds her power takes to come all the way up once it starts. */
const RAMP_SECONDS = 1.5;

/**
 * Unidade Alva powered: thin bands of energy climbing her armour, `delaySeconds` after she appears (as she lifts
 * her head in her intro). Swaps her meshes' materials for energized copies and puts them back when gone.
 */
export function BodyEnergy({ figure, color, delaySeconds }: { figure: Object3D; color: string; delaySeconds: number }) {
  const age = useAge();
  const swaps = useMemo(() => {
    const found: Swap[] = [];
    figure.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      // No overall glow: her white plating would wash out; only the bands show.
      found.push({ mesh, original: mesh.material, energy: energize(mesh.material as MeshStandardMaterial, color, 0) });
    });
    return found;
  }, [figure, color]);
  useEffect(() => {
    wear(swaps, true);
    return () => wear(swaps, false);
  }, [swaps]);

  useFrame(({ clock }) => {
    const since = age(clock.elapsedTime) - delaySeconds;
    const power = Math.min(1, Math.max(0, since / RAMP_SECONDS));
    // Twice the machines' strength: on her white plating fainter bands get lost.
    for (const { energy } of swaps) driveEnergy(energy, clock.elapsedTime, power, 1);
  });
  return null;
}
