import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { type NoiseLook, type Painter } from "../kit/textures";

/** Bare summit rock with cracks, grit and patches of hardy grass, fading out towards the rim. */
const paintSummitFloor: Painter = (context, size, random) => {
  context.fillStyle = "#5a5a52";
  context.fillRect(0, 0, size, size);
  const blot = (x: number, y: number, radius: number, colour: string) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  for (let index = 0; index < 90; index++) {
    blot(
      random() * size,
      random() * size,
      20 + random() * 40,
      random() < 0.5 ? "rgba(40,40,36,0.5)" : "rgba(120,118,106,0.45)",
    );
  }
  for (let index = 0; index < 70; index++) {
    blot(random() * size, random() * size, 10 + random() * 26, "rgba(96,122,56,0.6)");
  }
  context.lineCap = "round";
  for (let crack = 0; crack < 26; crack++) {
    let x = random() * size;
    let y = random() * size;
    let angle = random() * Math.PI * 2;
    context.strokeStyle = "rgba(24,24,20,0.6)";
    context.lineWidth = 1 + random() * 1.5;
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 5; step++) {
      angle += (random() - 0.5) * 1.1;
      x += Math.cos(angle) * 12;
      y += Math.sin(angle) * 12;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  for (let index = 0; index < 3200; index++) {
    context.fillStyle = random() < 0.5 ? "rgba(30,30,26,0.4)" : "rgba(150,148,136,0.35)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
};

/** A pointed leaf, white with a darker midrib, tinted per instance. */
export const paintLeaf: Painter = (context) => {
  const width = 64;
  const height = 40;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(2, height / 2);
  context.quadraticCurveTo(width * 0.45, -height * 0.15, width - 2, height / 2);
  context.quadraticCurveTo(width * 0.45, height * 1.15, 2, height / 2);
  context.fill();
  context.strokeStyle = "rgba(90,110,80,0.9)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(2, height / 2);
  context.lineTo(width - 6, height / 2);
  context.stroke();
};

export const STONE: NoiseLook = { base: [92, 90, 82], dark: [48, 48, 42], light: [140, 138, 126], fadeOut: false };

/** A goat track over the summit rock, leaves blown in by the wind and loose pebbles. */
const PEAK_GROUND: GroundDressing = {
  wash: { colour: "#86efac", alpha: 0.22 },
  path: { kind: "dirt", colour: "rgba(128,120,100,0.9)", edge: "rgba(70,66,56,0.55)", width: [0.1, 0.22], wind: 0.07 },
  litter: [
    { shape: "leaf", colours: ["#86efac", "#4ade80", "#bbf7d0"], count: 110, size: 4 },
    { shape: "pebble", colours: ["#8a8678", "#5f5c52"], count: 60, size: 3 },
  ],
};

export const paintPeakFloor = withDressing(paintSummitFloor, PEAK_GROUND);
