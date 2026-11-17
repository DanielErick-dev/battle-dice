"use client";

import { useEffect, useMemo, type Ref } from "react";
import { BufferAttribute, type MeshStandardMaterial } from "three";
import { useFittedProp } from "@/features/characters/core/props";
import { TILE_GAP, TILE_HEIGHT } from "@/features/shared/board/boardLayout";
import type { SlabOutline } from "@/features/shared/board/slab";
import { withLampGlow } from "../../environment/shared/lampGlow";
import { closeSlabGaps, warpOntoSlab } from "./pathSlab";

/** Share of the model's height where its walkway lies (measured on path-slab.glb); the kerbs and grass rise above. */
const WALKWAY_AT = 0.45;
/** Tall enough that the walkway is level with a plain slab's top, where figures and ornaments stand. */
const SLAB_RISE = TILE_HEIGHT / WALKWAY_AT;

/** The Meshy walkway (stone, kerbs, grass) bent onto one road slab; its material is the tile's own, to glow. */
interface PathSlabProps {
  outline: SlabOutline;
  materialRef: Ref<MeshStandardMaterial>;
  /** What it lights up in when flashed or hovered (see TileMesh). */
  emissive: string;
}

export function PathSlab({ outline, materialRef, emissive }: PathSlabProps) {
  const model = useFittedProp("pathSlab");
  // The layout hands a fresh outline each render: bent again only when its corners move.
  const key = outline.map(([x, z]) => `${x.toFixed(3)},${z.toFixed(3)}`).join(";");
  const geometry = useMemo(() => {
    const copy = model.geometry.clone();
    const { positions, normals } = warpOntoSlab(
      copy.getAttribute("position").array,
      copy.getAttribute("normal").array,
      { width: model.size[0], depth: model.size[2] },
      closeSlabGaps(outline, TILE_GAP),
      -TILE_HEIGHT / 2,
      SLAB_RISE,
    );
    copy.setAttribute("position", new BufferAttribute(positions, 3));
    copy.setAttribute("normal", new BufferAttribute(normals, 3));
    copy.computeBoundingBox();
    copy.computeBoundingSphere();
    return copy;
    // The key stands for the outline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, key]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useMemo(() => withLampGlow(model.material.clone()), [model.material]);
  useEffect(() => void material.emissive.set(emissive), [material, emissive]);
  useEffect(() => () => material.dispose(), [material]);

  return (
    // Flat on the ground: casting no shadow saves a shadow pass over some 200 slabs.
    <mesh geometry={geometry} receiveShadow>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}
