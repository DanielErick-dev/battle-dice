"use client";

import type { Ref } from "react";
import type { Material, Mesh } from "three";
import { GROUND_RADIUS } from "./geometry";

/** The habitat's painted ground: drawn first, and without depth (its material's), so feet sinking into it still show. */
export function GroundDisc({ material, radius = GROUND_RADIUS }: { material: Material; radius?: number }) {
  return (
    <mesh material={material} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
      <circleGeometry args={[radius, 64]} />
    </mesh>
  );
}

/** A square (`size` across) or a round (`radius`) sheet. */
type DecalShape = { size: number; radius?: never } | { radius: number; size?: never };

/** A flat sheet lying on the floor, centred under the figure: a painted circle, a glow, water, mist. */
export function FloorDecal({
  material,
  y,
  renderOrder = 0,
  ref,
  ...shape
}: DecalShape & { material: Material; y: number; renderOrder?: number; ref?: Ref<Mesh> }) {
  return (
    <mesh ref={ref} material={material} rotation-x={-Math.PI / 2} position-y={y} renderOrder={renderOrder}>
      {shape.radius === undefined ? (
        <planeGeometry args={[shape.size, shape.size]} />
      ) : (
        <circleGeometry args={[shape.radius, 64]} />
      )}
    </mesh>
  );
}
