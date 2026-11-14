export const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** A blizzard hugging him, nothing like the energy aura's licking flames. */
export const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uPower;
  uniform float uGusts;
  uniform vec3 uDeep;
  uniform vec3 uPale;
  varying vec2 vUv;

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

  // Noise wrapped round the cylinder with no seam: x runs 0..width as vUv.x runs 0..1.
  float wrapped(vec2 p, float width) {
    return mix(noise(p), noise(p - vec2(width, 0.0)), vUv.x);
  }

  void main() {
    float fade = smoothstep(0.0, 0.18, vUv.y) * pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.6);

    vec2 m = vec2(vUv.x * 6.0, vUv.y * 2.0 - uTime * 0.22);
    float mist = wrapped(m, 6.0) * 0.6 + wrapped(m * 2.0 + vec2(0.0, 3.1), 12.0) * 0.4;
    mist = smoothstep(0.4, 0.9, mist);

    // Five thin gusts winding up round him, each blowing in fits along its length.
    float s = vUv.x * 5.0 + vUv.y * 1.4 - uTime * 0.55;
    float band = 1.0 - abs(fract(s) * 2.0 - 1.0);
    float id = mod(floor(s), 5.0);
    float fits = smoothstep(0.35, 0.75, noise(vec2(id * 3.7, vUv.y * 2.5 - uTime * 0.9)));
    float gust = smoothstep(0.9, 1.0, band) * fits;

    // Kept under 1.0, so the bloom leaves it alone and the figure inside still reads.
    vec3 color = mix(uDeep, uPale, clamp(mist * 0.4 + gust, 0.0, 1.0));
    float alpha = (mist * 0.14 + gust * uGusts) * fade * uPower;
    gl_FragColor = vec4(color, alpha);
  }
`;
