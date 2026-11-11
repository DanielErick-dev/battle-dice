import { NOISE_GLSL } from "../../realm/glsl";

/** The dome's direction from its centre, for the gradient and the cloud layer. */
export const SKY_VERTEX = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Night gradient under storm clouds, blended towards hell's smoke and embers or heaven's bright day. */
export const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform float uInfernal;
  uniform float uCelestial;
  uniform float uTime;
  varying vec3 vDirection;

  ${NOISE_GLSL}

  void main() {
    float height = clamp(vDirection.y, 0.0, 1.0);
    vec3 color = mix(uHorizon, uZenith, pow(height, 0.45));
    // Project the dome onto a flat cloud layer overhead.
    vec2 layer = vDirection.xz / (vDirection.y + 0.25);

    // The mortal night is overcast: heavy dark clouds drift across the stars.
    float overcast = 1.0 - max(uInfernal, uCelestial);
    if (overcast > 0.001) {
      float storm = fbm(layer * 0.9 + vec2(uTime * 0.01, uTime * 0.004));
      float body = smoothstep(0.38, 0.78, storm) * smoothstep(0.0, 0.22, height);
      color = mix(color, vec3(0.03, 0.038, 0.05), body * 0.75 * overcast);
    }

    if (uInfernal > 0.001) {
      float smoke = fbm(layer * 1.6 + vec2(uTime * 0.03, -uTime * 0.02));
      float churn = fbm(layer * 3.4 - vec2(uTime * 0.05, uTime * 0.04) + smoke * 1.5);
      vec3 ash = vec3(0.05, 0.012, 0.01);
      vec3 embers = vec3(1.6, 0.35, 0.05) * pow(churn, 3.0) * (1.4 - height);
      vec3 hell = mix(color, ash, smoothstep(0.35, 0.75, smoke) * 0.85) + embers;
      // Glow of fire along the horizon.
      hell += vec3(0.9, 0.18, 0.02) * pow(1.0 - height, 6.0) * 1.2;
      color = mix(color, hell, uInfernal);
    }

    if (uCelestial > 0.001) {
      float cloud = fbm(layer * 1.2 + vec2(uTime * 0.012, uTime * 0.006));
      float puff = smoothstep(0.48, 0.78, cloud) * smoothstep(0.0, 0.25, height);
      vec3 heaven = mix(color, vec3(0.95, 0.9, 0.88), puff * 0.75);
      heaven += vec3(1.0, 0.8, 0.5) * pow(1.0 - height, 5.0) * 0.25;
      color = mix(color, heaven, uCelestial);
    }

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;
