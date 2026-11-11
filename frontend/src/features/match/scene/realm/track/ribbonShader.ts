/** Energy streaming along the ribbon from the portal towards the exit (vertex shader: UV_VERTEX). */
export const RIBBON_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uReveal;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    if (vUv.x > uReveal) discard;
    float pulses = smoothstep(0.55, 1.0, sin(vUv.x * 90.0 - uTime * 7.0));
    float core = 0.55 + 0.45 * sin(vUv.y * 6.2832 * 2.0);
    vec3 color = uColor * (1.2 + pulses * 2.2) * core;
    gl_FragColor = vec4(color, (0.45 + pulses * 0.55) * uOpacity);
  }
`;
