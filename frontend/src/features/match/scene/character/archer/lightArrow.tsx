"use client";

import { useMemo } from "react";
import type { BufferGeometry, MeshStandardMaterial } from "three";
import { fadingMaterial, preloadProps, PROP_HEIGHT, usePropMesh } from "../core/props";
import { useDisposable } from "../shared/disposal";

export const ARROW_LENGTH = 1.25;

export interface ArrowMaterials {
  /** The elven arrow's mesh (see PROPS.elvenArrow). */
  geometry: BufferGeometry;
  /** Its own textured material, as modelled, faded with the rest. */
  solid: MeshStandardMaterial;
  fade: (opacity: number) => void;
}

preloadProps(["elvenArrow"]);

/** The materials of a flight of elven arrows, faded together. */
export function useArrowMaterials(): ArrowMaterials {
  const { geometry, material } = usePropMesh("elvenArrow");
  const solid = useDisposable(
    useMemo(() => {
      const copy = fadingMaterial(material);
      copy.depthWrite = false;
      return copy;
    }, [material]),
  );
  return useMemo(
    () => ({ geometry, solid, fade: (opacity: number) => solid.setValues({ opacity }) }),
    [geometry, solid],
  );
}

/**
 * One elven arrow (the 3D model, nothing added) pointing up its local +Y, ARROW_LENGTH long and
 * centred on its middle. The arrows of one flight share their materials, so fading them fades them all.
 */
export function LightArrow({ materials }: { materials: ArrowMaterials }) {
  return <mesh geometry={materials.geometry} material={materials.solid} scale={ARROW_LENGTH / PROP_HEIGHT} />;
}
