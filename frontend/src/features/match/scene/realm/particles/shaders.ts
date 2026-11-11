/** Particles rising and wrapping from floor to ceiling, swaying, sized by distance. */
export const POINTS_VERTEX = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uRise;
  uniform float uSway;
  uniform float uSize;
  uniform float uFloor;
  uniform float uCeiling;
  uniform float uPixelRatio;
  varying float vSeed;
  varying float vHeight;

  void main() {
    vec3 p = position;
    float span = uCeiling - uFloor;
    // Each particle rises at its own pace and wraps back to the floor.
    p.y = uFloor + mod(p.y - uFloor + uTime * uRise * (0.5 + aSeed), span);
    p.x += sin(uTime * 0.8 + aSeed * 12.0) * uSway;
    p.z += cos(uTime * 0.6 + aSeed * 9.0) * uSway;
    vSeed = aSeed;
    vHeight = (p.y - uFloor) / span;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.5 + aSeed) * uPixelRatio * (40.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

/** A soft round point, flickering, fading in at the floor and out at the ceiling. */
export const POINTS_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uFlicker;
  varying float vSeed;
  varying float vHeight;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    float flicker = mix(1.0, 0.55 + 0.45 * sin(uTime * 9.0 + vSeed * 40.0), uFlicker);
    // Fade in near the floor and out near the ceiling so the wrap never pops.
    float life = smoothstep(0.0, 0.12, vHeight) * smoothstep(1.0, 0.7, vHeight);
    gl_FragColor = vec4(uColor * soft * flicker, soft * life * uOpacity);
  }
`;

/** A light shaft's cone, with view-space normal and direction for its soft silhouette. */
export const SHAFT_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

/** Soft at the silhouette, fading to the ground, with shimmering streaks. */
export const SHAFT_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  void main() {
    // Soft at the cone's silhouette, fading towards the ground, with slow shimmering streaks.
    float facing = abs(dot(vNormalView, vViewDir));
    float streaks = 0.7 + 0.3 * sin(vUv.x * 40.0 + uTime * 0.6) * sin(vUv.x * 17.0 - uTime * 0.4);
    float alpha = pow(facing, 2.0) * smoothstep(0.0, 0.45, vUv.y) * streaks * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;
