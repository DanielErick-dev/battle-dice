import { useMemo } from "react";
import {
  AdditiveBlending,
  ConeGeometry,
  DodecahedronGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointsMaterial,
  SpriteMaterial,
} from "three";
import { additiveMaterial } from "../shared/additive";
import { useDisposable, useDisposables } from "../shared/disposal";
import { GLACIER, ICE, useCrackTexture } from "../shared/ice";
import { useSoftDisc } from "../shared/softDisc";

/** The frost slam's geometries and materials, shared by all its pieces and freed with it. */
export function useFrostSlamMaterials() {
  const glow = useSoftDisc();
  const cracks = useCrackTexture();
  const materials = useMemo(
    () => ({
      // Base at the origin, so the spike grows up out of the floor as it scales.
      spike: new ConeGeometry(0.035, 1, 5).translate(0, 0.5, 0),
      shard: new ConeGeometry(0.012, 0.045, 4),
      chunk: new DodecahedronGeometry(1, 0),
      snow: new MeshStandardMaterial({
        color: "#f2f8ff",
        roughness: 0.9,
        flatShading: true,
        transparent: true,
      }),
      ice: new MeshStandardMaterial({
        color: ICE,
        emissive: GLACIER,
        emissiveIntensity: 0.6,
        metalness: 0.1,
        roughness: 0.15,
        flatShading: true,
        transparent: true,
      }),
      // Glacier blue rather than a glow, so the cracks still read on snow.
      frost: new MeshBasicMaterial({
        map: cracks,
        color: GLACIER,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
      wave: additiveMaterial({ color: ICE }),
      glow: new SpriteMaterial({
        map: glow,
        color: GLACIER.clone().lerp(ICE, 0.5),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      dust: new PointsMaterial({
        map: glow,
        color: ICE,
        size: 0.045,
        transparent: true,
        depthWrite: false,
      }),
    }),
    [cracks, glow],
  );
  useDisposables(materials);
  // Each sprite fades on its own, so the flash gets its own copy of the glow.
  const flash = useDisposable(useMemo(() => materials.glow.clone(), [materials]));
  return { ...materials, flash };
}
