import { NOISE_GLSL } from "../glsl";

/** Hellfire whirling up a funnel: noise scrolled around and up the walls. */
export const FIRE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  ${NOISE_GLSL}
  void main() {
    vec2 p = vec2(vUv.x * 7.0 + uTime * 1.6 + vUv.y * 4.0, vUv.y * 2.6 - uTime * 2.4);
    float n = fbm(p);
    float flame = smoothstep(0.32, 0.82, n + (1.0 - vUv.y) * 0.4);
    vec3 cool = vec3(0.7, 0.05, 0.0);
    vec3 hot = vec3(2.4, 0.75, 0.1);
    vec3 color = mix(cool, hot, flame * flame);
    float alpha = flame * smoothstep(1.0, 0.55, vUv.y) * smoothstep(0.0, 0.06, vUv.y) * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

/** The mouth of the tunnel on the tile: a dark swirling pit with a burning rim. */
export const PIT_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  ${NOISE_GLSL}
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float angle = atan(p.y, p.x);
    float swirl = fbm(vec2(angle * 1.6 + uTime * 1.3 + r * 4.0, r * 5.0 - uTime * 2.2));
    float rim = smoothstep(0.28, 0.0, abs(r - 0.82 - swirl * 0.1));
    float depth = smoothstep(0.85, 0.1, r);
    vec3 abyss = mix(vec3(0.5, 0.04, 0.0) * swirl * 2.0, vec3(0.02, 0.0, 0.0), depth);
    vec3 color = abyss + vec3(3.6, 1.1, 0.15) * rim * (0.6 + swirl);
    gl_FragColor = vec4(color, uOpacity * smoothstep(1.0, 0.9, r));
  }
`;

/** A pillar of light pouring down from the sky, streaked and shimmering. */
export const PILLAR_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float streaks = 0.55 + 0.45 * sin(vUv.x * 55.0 + sin(vUv.y * 6.0 - uTime * 3.0) * 2.0);
    float flow = 0.7 + 0.3 * sin(vUv.y * 30.0 + uTime * 8.0);
    float ends = smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.3, vUv.y);
    vec3 color = vec3(2.6, 2.3, 1.6) * streaks * flow;
    gl_FragColor = vec4(color, ends * streaks * uOpacity * 0.8);
  }
`;

/** A glowing rune circle on the tile under the pillar. */
export const SEAL_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float angle = atan(p.y, p.x) + uTime * 0.6;
    float rings = smoothstep(0.035, 0.0, abs(r - 0.92)) + smoothstep(0.03, 0.0, abs(r - 0.7));
    float runes = step(0.72, r) * step(r, 0.9) * step(0.5, fract(angle * 3.8197)) * 0.6;
    float star = smoothstep(0.05, 0.0, abs(r * cos(mod(angle, 1.0472) - 0.5236) - 0.45)) * step(r, 0.7);
    float core = smoothstep(0.6, 0.0, r) * 0.5;
    vec3 color = vec3(2.8, 2.2, 1.1) * (rings + runes + star + core);
    gl_FragColor = vec4(color, clamp(rings + runes + star + core, 0.0, 1.0) * uOpacity);
  }
`;
