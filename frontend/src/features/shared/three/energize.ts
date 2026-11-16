import { Color, type MeshStandardMaterial } from "three";

/** What an energized material's flow reads every frame: the clock and how much power there is (0 to 1). */
export interface EnergyUniforms {
  uTime: { value: number };
  uPower: { value: number };
  uFlow: { value: Color };
}

/**
 * A copy of `material` with bands of light climbing it in world space: the machines' power flowing over them.
 * Its surface colours glow too (`glow`, Meshy bakes no emissive map). Drive it through the returned uniforms.
 */
export function energize(
  material: MeshStandardMaterial,
  color: string,
  glow = 0.3,
  /** "rise" climbs a standing machine; "ripple" spreads out in rings across a floor. */
  flow: "rise" | "ripple" = "rise",
) {
  const copy = material.clone();
  // Each machine at its own pace, so their flows never line up.
  const speed = 1.2 + Math.random() * 1.8;
  const phase = Math.random() * 10;
  const gate = 0.6 + Math.random() * 1.4;
  const uniforms: EnergyUniforms = { uTime: { value: 0 }, uPower: { value: 0 }, uFlow: { value: new Color(color) } };
  copy.emissiveMap ??= copy.map;
  copy.emissive = new Color("#ffffff");
  copy.emissiveIntensity = 0;
  copy.userData.glow = glow;
  copy.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vEnergyWorld;")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvEnergyWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vEnergyWorld;\nuniform float uTime;\nuniform float uPower;\nuniform vec3 uFlow;",
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        // A hairline band at its own pace, flickering in and out at its own irregular rhythm.
        float energyRun = ${
          flow === "rise"
            ? "vEnergyWorld.y * 9.0 + vEnergyWorld.x * 2.5 + vEnergyWorld.z * 1.5"
            : "length(vEnergyWorld.xz) * -5.0"
        } - uTime * ${speed.toFixed(3)} + ${phase.toFixed(3)};
        float energyBand = pow(0.5 + 0.5 * sin(energyRun * 3.1416), 60.0);
        float energyGate = smoothstep(0.2, 0.9, sin(uTime * ${(gate * 1.3).toFixed(3)} + ${phase.toFixed(3)}) * sin(uTime * ${gate.toFixed(3)} * 0.37 + 1.7));
        totalEmissiveRadiance += uFlow * energyBand * energyGate * uPower * 0.9;`,
      );
  };
  // Keeps three from reusing the plain material's compiled program for it.
  copy.customProgramCacheKey = () => `energized:${flow}:${speed}:${phase}:${gate}`;
  return { material: copy, uniforms };
}

/** Sets an energized material's flow and glow for this frame. */
export function driveEnergy(
  { material, uniforms }: ReturnType<typeof energize>,
  time: number,
  power: number,
  boost = 0,
): void {
  uniforms.uTime.value = time;
  uniforms.uPower.value = power * (1 + boost);
  material.emissiveIntensity = (material.userData.glow as number) * power * (1 + boost);
}
