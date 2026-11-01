import { seededRandom } from "@/game/domain/random";
import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { speckle } from "../kit/painting";
import type { CanvasLook, NoiseLook } from "../kit/textures";
import { shoreline } from "./shoreline";

/** Pale moonlit sand, darker and glossier where the tide has just been, with ripple marks and grit. */
function drawSand(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(13);
  context.fillStyle = "#8a8579";
  context.fillRect(0, 0, size, size);
  // The canvas's top is the stage's back, towards the sea.
  const wet = context.createLinearGradient(0, 0, 0, size);
  wet.addColorStop(0, "rgba(38,46,58,0.9)");
  wet.addColorStop(0.36, "rgba(48,56,66,0.55)");
  wet.addColorStop(0.55, "rgba(60,64,70,0)");
  context.fillStyle = wet;
  context.fillRect(0, 0, size, size);
  context.lineWidth = 2;
  for (let line = 0; line < 26; line++) {
    const y = random() * size;
    context.strokeStyle = random() < 0.5 ? "rgba(60,58,54,0.25)" : "rgba(170,164,150,0.2)";
    context.beginPath();
    for (let x = 0; x <= size; x += 8) context.lineTo(x, y + Math.sin(x * 0.05 + line) * 5);
    context.stroke();
  }
  speckle(context, size, random, {
    count: 4000,
    odds: 0.55,
    colours: ["rgba(50,48,44,0.35)", "rgba(196,190,176,0.3)"],
    spread: 1.5,
  });
}

/** Light crests over a mid-blue, tiling, scrolled shorewards. */
function drawRipples(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(29);
  context.fillStyle = "#6f8fb5";
  context.fillRect(0, 0, size, size);
  for (let crest = 0; crest < 22; crest++) {
    const y = (crest / 22) * size + random() * 6;
    context.strokeStyle = `rgba(214,232,255,${0.25 + random() * 0.35})`;
    context.lineWidth = 1 + random() * 2;
    context.beginPath();
    // Whole periods across the canvas, so the texture tiles without a seam.
    const waves = 2 + Math.floor(random() * 3);
    const phase = random() * Math.PI * 2;
    for (let x = 0; x <= size; x += 4) context.lineTo(x, y + Math.sin((x / size) * waves * Math.PI * 2 + phase) * 4);
    context.stroke();
  }
}

/** Opaque out past the shoreline, feathered at the edge and faded towards the rim. */
function drawWaterMask(context: CanvasRenderingContext2D, size: number) {
  const image = context.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px / size) * 2 - 1;
      const z = (py / size) * 2 - 1;
      const depth = Math.min(1, Math.max(0, (shoreline(x) - z) / 0.12));
      const rim = 1 - Math.min(1, Math.max(0, (Math.hypot(x, z) - 0.7) / 0.3));
      const value = Math.round(255 * depth * rim * 0.85);
      const at = (py * size + px) * 4;
      image.data[at] = image.data[at + 1] = image.data[at + 2] = value;
      image.data[at + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}

/** Broken foam along the water's edge, and a fainter line of it a wave further out. */
function drawFoam(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(37);
  const toCanvas = (value: number) => ((value + 1) / 2) * size;
  [
    { offset: 0, count: 700, alpha: 0.55 },
    { offset: -0.12, count: 300, alpha: 0.25 },
  ].forEach(({ offset, count, alpha }) => {
    for (let blob = 0; blob < count; blob++) {
      const x = random() * 2 - 1;
      const z = shoreline(x) + offset + (random() - 0.5) * 0.03;
      context.fillStyle = `rgba(236,244,255,${alpha * (0.4 + random() * 0.6)})`;
      context.beginPath();
      context.arc(toCanvas(x), toCanvas(z), 0.6 + random() * 2.6, 0, Math.PI * 2);
      context.fill();
    }
  });
}

/** Footprints of wet sand down to the water, shells and pebbles, a moonlit blue. */
const SHORE_GROUND: GroundDressing = {
  wash: { colour: "#3b82f6", alpha: 0.22 },
  path: {
    kind: "dirt",
    colour: "rgba(150,135,105,0.6)",
    edge: "rgba(110,98,76,0.35)",
    width: [0.12, 0.22],
    wind: 0.05,
  },
  litter: [
    { shape: "petal", colours: ["#fde7f0", "#f5d0c5", "#e0e7ff"], count: 50, size: 4 },
    { shape: "pebble", colours: ["#94a3b8", "#cbd5e1"], count: 50, size: 3 },
  ],
};
export const SAND: CanvasLook = { size: 512, draw: withDressing(drawSand, SHORE_GROUND), fadeFrom: 0.55 };
export const RIPPLES: CanvasLook = { size: 256, draw: drawRipples, tile: true };
export const WATER_MASK: CanvasLook = { size: 256, draw: drawWaterMask, linear: true };
export const FOAM: CanvasLook = { size: 512, draw: drawFoam, fadeFrom: 0.65 };
export const STONE: NoiseLook = {
  base: [112, 116, 122],
  dark: [62, 68, 76],
  light: [150, 156, 162],
  fadeOut: false,
};
