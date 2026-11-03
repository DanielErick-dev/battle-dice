import { AdditiveBlending, DoubleSide, PlaneGeometry, ShaderMaterial } from "three";

/** Noise shared by the flame and its embers. */
const NOISE = /* glsl */ `
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      sum += amp * noise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      amp *= 0.5;
    }
    return sum;
  }
`;

const FLAME_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uLean;
  uniform float uStretch;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    // The tip bends most: it trails behind when the hand moves and sways on its own.
    float bend = pow(uv.y, 1.6);
    p.x += (uLean + sin(uTime * 2.7) * 0.03 + sin(uTime * 4.3) * 0.02) * bend;
    p.y *= 1.0 + uStretch;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FLAME_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uGlow;
  varying vec2 vUv;
  ${NOISE}
  void main() {
    vec2 p = vec2((vUv.x - 0.5) * 2.0, vUv.y);
    float slow = fbm(vec2(p.x * 1.8, p.y * 2.2 - uTime * 1.9));
    float fast = fbm(vec2(p.x * 3.6 + 4.0, p.y * 4.6 - uTime * 3.3));
    // Turbulence grows with height, so the base holds still and the tongues lick about.
    float x = p.x + ((slow - 0.5) * 0.7 + (fast - 0.5) * 0.35) * p.y;
    float width = 0.58 * pow(max(1.0 - p.y, 0.0), 0.85) * smoothstep(0.0, 0.16, p.y + 0.03);
    float body = 1.0 - smoothstep(width * 0.45, width, abs(x));
    // Tongues tear loose near the top instead of the flame ending in a clean point.
    float torn = smoothstep(0.3, 0.7, fast + (1.0 - p.y) * 0.75 - 0.15);
    float shape = body * torn;
    float heat = shape * (1.05 - p.y * 0.9) * (1.0 - 0.55 * abs(x) / max(width, 0.001));

    vec3 color = vec3(0.45, 0.03, 0.0);
    color = mix(color, vec3(1.0, 0.28, 0.02), smoothstep(0.08, 0.35, heat));
    color = mix(color, vec3(1.0, 0.72, 0.22), smoothstep(0.35, 0.65, heat));
    color = mix(color, vec3(1.0, 0.95, 0.82), smoothstep(0.7, 0.95, heat));
    float alpha = smoothstep(0.02, 0.22, heat);
    // Only the white core crosses bloom's 1.0, so it glows without swallowing the figure.
    gl_FragColor = vec4(color * alpha * uGlow * (0.85 + heat * 0.4), alpha);
  }
`;

/** A camera-facing flame card, 1 wide and FLAME_ASPECT tall with its foot at the origin: a live fire, not a sprite. */
export const FLAME_ASPECT = 1.7;

export function createFlameGeometry(): PlaneGeometry {
  const geometry = new PlaneGeometry(1, FLAME_ASPECT, 8, 16);
  geometry.translate(0, FLAME_ASPECT / 2, 0);
  return geometry;
}

export function createFlameMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: FLAME_VERTEX,
    fragmentShader: FLAME_FRAGMENT,
    uniforms: { uTime: { value: 0 }, uLean: { value: 0 }, uStretch: { value: 0 }, uGlow: { value: 1 } },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  });
}

const EMBER_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uLean;
  uniform float uSize;
  attribute float aSeed;
  varying float vLife;
  void main() {
    float life = fract(uTime * (0.45 + aSeed * 0.35) + aSeed * 7.0);
    vLife = life;
    vec3 p = vec3(
      (aSeed - 0.5) * 0.35 + sin(uTime * 3.0 + aSeed * 20.0) * 0.08 * life + uLean * life * 1.4,
      0.4 + life * 1.6,
      cos(uTime * 2.0 + aSeed * 11.0) * 0.08 * life
    );
    vec4 view = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (1.0 - life * 0.6) / -view.z;
    gl_Position = projectionMatrix * view;
  }
`;

const EMBER_FRAGMENT = /* glsl */ `
  varying float vLife;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float dot = smoothstep(0.5, 0.1, d);
    // Each spark flares as it leaves the flame and dies out cooling to red.
    float fade = smoothstep(0.0, 0.1, vLife) * (1.0 - smoothstep(0.55, 1.0, vLife));
    vec3 color = mix(vec3(1.0, 0.75, 0.3), vec3(0.9, 0.15, 0.0), vLife);
    gl_FragColor = vec4(color * dot * fade, dot * fade);
  }
`;

export function createEmberMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: EMBER_VERTEX,
    fragmentShader: EMBER_FRAGMENT,
    uniforms: { uTime: { value: 0 }, uLean: { value: 0 }, uSize: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

/** Writes the frame's values into a flame or ember material's uniforms. */
export function setUniforms(material: ShaderMaterial, values: Record<string, number>): void {
  for (const [name, value] of Object.entries(values)) material.uniforms[name].value = value;
}
