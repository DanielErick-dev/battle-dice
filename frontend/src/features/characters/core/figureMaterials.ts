import { Color, Mesh, MeshStandardMaterial, type Object3D } from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

/**
 * A private copy of the model (own skeleton) that casts shadows; with `ghost`, a see-through
 * shadow of it instead, its outline glowing in that colour, casting none.
 */
export function prepareFigure(source: Object3D, ghost?: string, fallen = false) {
  const figure = cloneSkinned(source);
  const ghostMaterial = ghost ? shadowMaterial(ghost) : null;
  figure.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    if (ghostMaterial) node.material = ghostMaterial;
    else if (fallen && node.material instanceof MeshStandardMaterial) node.material = charredMaterial(node.material);
    node.castShadow = !ghostMaterial;
    // The bind-pose bounds don't follow the animated bones; a running figure could get culled.
    node.frustumCulled = false;
  });
  return figure;
}

/**
 * A living shadow: nearly black and see-through, with only its outline glowing in `rim` (the
 * edges, where the surface turns away from the view, light up as smoke does against the light).
 */
function shadowMaterial(rim: string): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color: "#04050a",
    emissive: new Color(rim),
    emissiveIntensity: 0.08,
    transparent: true,
    opacity: 0.72,
    // Writing depth keeps the far side of the body (the back arm, the other leg) from showing
    // through the near one, which made the shadow look twisted.
    depthWrite: true,
    roughness: 1,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = { value: new Color(rim).multiplyScalar(1.6) };
    shader.fragmentShader = shader.fragmentShader.replace("void main() {", "uniform vec3 uRim;\nvoid main() {").replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
        float facing = abs(dot(normalize(normal), normalize(vViewPosition)));
        totalEmissiveRadiance += uRim * pow(1.0 - facing, 3.0);`,
    );
  };
  return material;
}

/**
 * The figure's own material burnt: its colours darkened to soot, embers glowing along its outline
 * and a slow smoulder (Seraphiel fallen, until his own model is made).
 */
function charredMaterial(source: MeshStandardMaterial): MeshStandardMaterial {
  const material = source.clone();
  material.color.multiplyScalar(0.32);
  material.emissive = new Color("#2a0402");
  material.emissiveIntensity = 1;
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
        float facing = abs(dot(normalize(normal), normalize(vViewPosition)));
        totalEmissiveRadiance += vec3(1.0, 0.16, 0.03) * pow(1.0 - facing, 2.5) * 1.6;`,
    );
  };
  material.customProgramCacheKey = () => "fallen-charred";
  return material;
}
