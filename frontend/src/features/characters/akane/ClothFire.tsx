"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, ShaderChunk, ShaderMaterial, SkinnedMesh, type Object3D } from "three";
import { useAge } from "@/features/match/scene/useAge";
import { setUniforms } from "./flameShader";

/** Seconds the fire takes to spread over him as it lights. */
const LIGHT_SECONDS = 0.6;

const VERTEX = /* glsl */ `
${ShaderChunk.common}
${ShaderChunk.skinning_pars_vertex}
uniform float uMinY;
uniform float uMaxY;
varying vec3 vBody;
varying float vHeight;
varying vec3 vNormalView;
varying vec3 vView;
void main() {
  ${ShaderChunk.skinbase_vertex}
  ${ShaderChunk.beginnormal_vertex}
  ${ShaderChunk.skinnormal_vertex}
  ${ShaderChunk.defaultnormal_vertex}
  ${ShaderChunk.begin_vertex}
  // The fire's pattern follows the cloth (the rest pose), so it clings to it as he moves.
  vBody = position;
  vHeight = (position.y - uMinY) / (uMaxY - uMinY);
  ${ShaderChunk.skinning_vertex}
  // Swollen a hair off the cloth, so it never fights the clothes for the same depth.
  transformed += objectNormal * 0.004 * (uMaxY - uMinY);
  ${ShaderChunk.project_vertex}
  vNormalView = normalize(transformedNormal);
  vView = -mvPosition.xyz;
}
`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uLit;
uniform float uScale;
varying vec3 vBody;
varying float vHeight;
varying vec3 vNormalView;
varying vec3 vView;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    amp *= 0.5;
  }
  return sum;
}

void main() {
  // Tongues of fire licking up the cloth: noise climbing faster than it drifts, stretched upward.
  vec3 p = vBody * uScale;
  float rising = fbm(vec3(p.x * 1.2, p.y * 0.55 - uTime * 1.6, p.z * 1.2 + uTime * 0.2));
  float detail = fbm(p * 2.3 + vec3(0.0, -uTime * 2.6, 0.0));
  float rim = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vView))), 2.0);
  float heat = rising * 0.85 + detail * 0.35 + rim * 0.45;
  // Spreads up from his feet as it lights; never over his face or hair.
  float lit = 1.0 - smoothstep(uLit - 0.1, uLit, vHeight);
  float spared = 1.0 - smoothstep(0.8, 0.86, vHeight);
  float flame = smoothstep(0.62, 0.95, heat) * lit * spared;
  vec3 colour = mix(vec3(0.75, 0.06, 0.01), vec3(1.0, 0.62, 0.18), smoothstep(0.75, 1.05, heat));
  gl_FragColor = vec4(colour * flame * 1.3, flame);
}
`;

/**
 * Akane's clothes on fire without burning up: tongues of flame licking up a second skin of his own mesh, following
 * the cloth as he moves, kept off his face and hair. `igniteAt`: seconds after mounting it lights (the snap of his
 * fingers in his intro), spreading up from his feet; lit from the start without it.
 */
export function ClothFire({ figure, igniteAt = 0 }: { figure: Object3D; igniteAt?: number }) {
  const age = useAge();
  const sheath = useMemo(() => {
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uLit: { value: 0 },
        uMinY: { value: 0 },
        uMaxY: { value: 1 },
        uScale: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const skins: SkinnedMesh[] = [];
    figure.traverse((node) => {
      if (!(node instanceof SkinnedMesh) || node.userData.clothFire) return;
      node.geometry.computeBoundingBox();
      const box = node.geometry.boundingBox!;
      const skin = new SkinnedMesh(node.geometry, material);
      skin.userData.clothFire = true;
      skin.bind(node.skeleton, node.bindMatrix);
      skin.frustumCulled = false;
      skin.renderOrder = 2;
      skins.push(skin);
      material.uniforms.uMinY.value = box.min.y;
      material.uniforms.uMaxY.value = box.max.y;
      // About eight tongues of fire up his height, whatever units the model is in.
      material.uniforms.uScale.value = 8 / Math.max(box.max.y - box.min.y, 1e-3);
    });
    return { material, skins };
  }, [figure]);

  useEffect(() => {
    // Each second skin goes beside the mesh it copies, under the same transforms.
    const owners: Object3D[] = [];
    figure.traverse((node) => {
      if (node instanceof SkinnedMesh && !node.userData.clothFire) owners.push(node.parent ?? figure);
    });
    sheath.skins.forEach((skin, index) => owners[index]?.add(skin));
    return () => {
      sheath.skins.forEach((skin) => skin.removeFromParent());
      sheath.material.dispose();
    };
  }, [sheath, figure]);
  const live = useRef(sheath);

  useFrame(({ clock }) => {
    const lit = Math.min(1, Math.max(0, (age(clock.elapsedTime) - igniteAt) / LIGHT_SECONDS));
    const { material, skins } = live.current;
    setUniforms(material, { uTime: clock.elapsedTime, uLit: lit });
    skins.forEach((skin) => (skin.visible = lit > 0));
  });

  return null;
}
