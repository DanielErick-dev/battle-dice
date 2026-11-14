import type { Color } from "three";

/** Silhouette glow spliced into MeshStandardMaterial; it also raises opacity so a see-through spirit keeps its outline. */
const RIM_GLSL = /* glsl */ `
  #include <emissivemap_fragment>
  float rimFacing = 1.0 - abs(dot(normalize(vViewPosition), normal));
  float rimGlow = pow(rimFacing, 2.2) * uRimStrength;
  totalEmissiveRadiance += uRimColor * rimGlow;
  diffuseColor.a = min(1.0, diffuseColor.a + rimGlow * 0.5);
`;

export interface RimUniforms {
  uRimColor: { value: Color };
  uRimStrength: { value: number };
}

/** The fragment shader with the rim glow spliced in, and its uniforms declared. */
export function withRim(fragmentShader: string): string {
  return `uniform vec3 uRimColor;\nuniform float uRimStrength;\n${fragmentShader.replace(
    "#include <emissivemap_fragment>",
    RIM_GLSL,
  )}`;
}
