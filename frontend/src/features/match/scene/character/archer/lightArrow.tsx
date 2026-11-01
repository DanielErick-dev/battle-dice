"use client";

import { useMemo } from "react";
import { Color, type BufferGeometry, type MeshBasicMaterial, type MeshStandardMaterial } from "three";
import { fadingMaterial, preloadProps, PROP_HEIGHT, usePropMesh } from "../core/props";
import { useGlowMaterial } from "../shared/additive";
import { useDisposable } from "../shared/disposal";

export const ARROW_LENGTH = 1.25;

export interface ArrowMaterials {
  /** The elven arrow's mesh (see PROPS.elvenArrow). */
  geometry: BufferGeometry;
  /** Its own textured material, its green flames glowing a little, faded with the rest. */
  solid: MeshStandardMaterial;
  /** A faint sheath of light in the flight's colour round the shaft. */
  glow: MeshBasicMaterial;
  fade: (opacity: number) => void;
}

preloadProps(["elvenArrow"]);

/** The materials of a flight of elven arrows, faded together. */
export function useArrowMaterials(glow: Color): ArrowMaterials {
  const sheath = useGlowMaterial(glow);
  const { geometry, material } = usePropMesh("elvenArrow");
  const solid = useDisposable(
    useMemo(() => {
      const copy = fadingMaterial(material);
      copy.depthWrite = false;
      copy.emissive = new Color("#ffffff");
      copy.emissiveMap = copy.map;
      copy.emissiveIntensity = 0.45;
      return copy;
    }, [material]),
  );
  return useMemo(
    () => ({
      geometry,
      solid,
      glow: sheath,
      fade: (opacity: number) => {
        sheath.setValues({ opacity: opacity * 0.25 });
        solid.setValues({ opacity });
      },
    }),
    [geometry, solid, sheath],
  );
}

/**
 * One elven arrow (green flames curling round its gilded shaft) pointing up its local +Y,
 * ARROW_LENGTH long and centred on its middle, in a faint sheath of light. The arrows of one
 * flight share their materials, so fading them fades them all.
 */
export function LightArrow({ materials }: { materials: ArrowMaterials }) {
  return (
    <group>
      <mesh geometry={materials.geometry} material={materials.solid} scale={ARROW_LENGTH / PROP_HEIGHT} />
      <mesh material={materials.glow}>
        <cylinderGeometry args={[0.06, 0.06, ARROW_LENGTH, 6]} />
      </mesh>
    </group>
  );
}
