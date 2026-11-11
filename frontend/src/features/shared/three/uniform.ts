import type { IUniform, ShaderMaterial } from "three";

/** A uniform the material was built with: a missing one is a typo, so it fails loudly. */
export function uniform(material: ShaderMaterial, name: string): IUniform {
  const found = material.uniforms[name];
  if (!found) throw new Error(`Shader material has no uniform ${name}`);
  return found;
}
