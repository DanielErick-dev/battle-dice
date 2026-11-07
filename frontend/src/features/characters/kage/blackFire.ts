import { useMemo } from "react";
import { Color, DoubleSide, type CanvasTexture, type MeshStandardMaterial } from "three";
import { preloadProps, usePropMesh } from "../core/props";
import { canvasTexture, createCanvas, useCanvasTexture } from "../shared/canvas";
import { useDisposable } from "../shared/disposal";
import { parkMiller } from "../shared/hash";
import { withRim, type RimUniforms } from "../shared/rimGlow";

/** The clock every black fire flickers to (one for all of them, set as the scene draws). */
export const FLAME_TIME = { value: 0 };
/** The fires on a burning tile: a tall one in the middle, two lower ones beside it (shares of the tile). */
export const FIRES = [
  { x: 0, z: 0, height: 1.7, turn: 0 },
  // A ring of smaller fires out to the edges, so the whole tile burns.
  { x: -0.3, z: -0.3, height: 1.15, turn: 1.3 },
  { x: 0.3, z: -0.3, height: 1.05, turn: 2.9 },
  { x: -0.3, z: 0.3, height: 1.0, turn: 4.4 },
  { x: 0.3, z: 0.3, height: 1.2, turn: 5.6 },
  { x: 0, z: -0.34, height: 0.85, turn: 0.7 },
  { x: 0, z: 0.34, height: 0.9, turn: 3.6 },
  { x: -0.34, z: 0, height: 0.8, turn: 2.2 },
  { x: 0.34, z: 0, height: 0.85, turn: 5.0 },
];
/** The model's own height (PROP_HEIGHT), and how far its lowest point is below its middle. */
export const FIRE_MODEL_BOTTOM = 0.95;

/**
 * Bends the black fire model as it burns: its tongues sway and lick, more the higher they are (the
 * base stays put), each part of it out of step with the rest.
 */
const FIRE_SWAY_GLSL = /* glsl */ `
  #include <begin_vertex>
  float flameRise = clamp((position.y + 0.95) / 1.85, 0.0, 1.0);
  float flameSway = flameRise * flameRise;
  transformed.x += sin(uFlameTime * 2.4 - position.y * 3.5 + position.z * 2.0) * 0.08 * flameSway;
  transformed.z += cos(uFlameTime * 2.1 - position.y * 3.0 + position.x * 2.5) * 0.08 * flameSway;
  transformed.y += sin(uFlameTime * 3.2 - position.y * 4.0 + position.x * 3.0) * 0.04 * flameSway;
`;

preloadProps(["blackFlame"]);

/**
 * Amaterasu's look, like Itachi's: pitch-black fire (FIRE_BODY), a faint ember glow inside it, and a
 * dark crimson burning along its edges.
 */
const FIRE_BODY = "#050104";
const FIRE_EMBER = "#ff3048";
export const FIRE_EMBER_GLOW = 0.18;
const FIRE_RIM = "#c0102c";
const FIRE_RIM_STRENGTH = 1.6;

/** The black fire model's material, glowing red along its edges and bent by FIRE_SWAY_GLSL. */
export function useFireMaterial(): MeshStandardMaterial {
  const { material } = usePropMesh("blackFlame");
  const fire = useMemo(() => {
    const copy = material.clone();
    copy.side = DoubleSide;
    // Amaterasu: the fire itself is black, its texture only a faint ember glow deep inside it…
    copy.color = new Color(FIRE_BODY);
    copy.emissive = new Color(FIRE_EMBER);
    copy.emissiveMap = copy.map;
    copy.emissiveIntensity = FIRE_EMBER_GLOW;
    copy.roughness = 1;
    // …and its edges burn a dark crimson.
    const rim: RimUniforms = { uRimColor: { value: new Color(FIRE_RIM) }, uRimStrength: { value: FIRE_RIM_STRENGTH } };
    copy.onBeforeCompile = (shader) => {
      shader.uniforms.uFlameTime = FLAME_TIME;
      Object.assign(shader.uniforms, rim);
      shader.vertexShader = `uniform float uFlameTime;\n${shader.vertexShader.replace("#include <begin_vertex>", FIRE_SWAY_GLSL)}`;
      shader.fragmentShader = withRim(shader.fragmentShader);
    };
    copy.customProgramCacheKey = () => "blackFlameSwayRim";
    return copy;
  }, [material]);
  return useDisposable(fire);
}

/** Charred ground with glowing cracks: black where it's dark, white along the embers (tinted by the emissive). */
function drawEmbers(): CanvasTexture {
  const size = 256;
  const { canvas, context } = createCanvas(size);
  context.fillStyle = "#050203";
  context.fillRect(0, 0, size, size);
  const random = parkMiller(29);
  context.lineCap = "round";
  for (let crack = 0; crack < 26; crack++) {
    let [x, y] = [random() * size, random() * size];
    context.strokeStyle = `rgba(255,255,255,${0.35 + random() * 0.5})`;
    context.lineWidth = 1 + random() * 2.5;
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 5; step++) {
      x += (random() - 0.5) * 50;
      y += (random() - 0.5) * 50;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  return canvasTexture(canvas, true);
}

export function useEmberTexture(): CanvasTexture {
  return useCanvasTexture(drawEmbers);
}
