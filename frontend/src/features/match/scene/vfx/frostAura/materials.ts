import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointsMaterial,
  ShaderMaterial,
  SpriteMaterial,
  type CanvasTexture,
  type Texture,
} from "three";
import { GLACIER, ICE } from "@/features/characters/shared/ice";
import { FRAGMENT, VERTEX } from "./shader";

export function createFrostMaterials(cracks: Texture, disc: Texture) {
  const shell = (deep: string, pale: string, gusts: number, time: number) =>
    new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTime: { value: time },
        uPower: { value: 0 },
        uGusts: { value: gusts },
        uDeep: { value: new Color(deep) },
        uPale: { value: new Color(pale) },
      },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
    });
  return {
    mist: shell("#1e3a8a", "#bfe3ff", 0.12, 0),
    gale: shell("#1d4ed8", "#e6f6ff", 0.4, 4.1),
    crystal: new MeshStandardMaterial({
      color: "#e8f6ff",
      emissive: "#3b82c4",
      emissiveIntensity: 0.35,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
    }),
    snow: new PointsMaterial({
      map: disc,
      size: 0.07,
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
    frost: new MeshBasicMaterial({
      map: cracks,
      color: ICE,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
    wave: new MeshBasicMaterial({
      color: ICE,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
    flash: new SpriteMaterial({
      map: disc,
      color: GLACIER.clone().lerp(ICE, 0.5),
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  };
}

/** Each crystal glints on its own, so each glint gets its own material. */
export function createGlintMaterials(count: number, star: CanvasTexture) {
  return Array.from(
    { length: count },
    () =>
      new SpriteMaterial({
        map: star,
        color: new Color("#e6f6ff"),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
  );
}
