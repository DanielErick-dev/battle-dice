import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { type NoiseLook, type Painter } from "../kit/textures";

/** Moss in mottled greens, bare earth showing through, blades of grass and a few fallen leaves. */
const paintMossFloor: Painter = (context, size, random) => {
  context.fillStyle = "#26361a";
  context.fillRect(0, 0, size, size);
  const blot = (x: number, y: number, radius: number, colour: string) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  for (let index = 0; index < 40; index++)
    blot(random() * size, random() * size, 14 + random() * 30, "rgba(58,40,24,0.7)");
  for (let index = 0; index < 220; index++) {
    const green = random() < 0.5 ? "rgba(84,124,40,0.55)" : "rgba(40,70,26,0.6)";
    blot(random() * size, random() * size, 8 + random() * 26, green);
  }
  context.lineCap = "round";
  for (let index = 0; index < 4200; index++) {
    const x = random() * size;
    const y = random() * size;
    const angle = random() * Math.PI * 2;
    const length = 2 + random() * 6;
    const light = random();
    context.strokeStyle =
      light < 0.4 ? "rgba(140,190,70,0.45)" : light < 0.8 ? "rgba(60,96,32,0.5)" : "rgba(18,28,12,0.5)";
    context.lineWidth = 0.8 + random();
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.stroke();
  }
  for (let index = 0; index < 90; index++) {
    context.save();
    context.translate(random() * size, random() * size);
    context.rotate(random() * Math.PI);
    context.fillStyle = ["rgba(176,140,48,0.75)", "rgba(140,92,36,0.7)", "rgba(156,170,60,0.7)"][index % 3];
    context.beginPath();
    context.ellipse(0, 0, 4 + random() * 3, 2 + random() * 1.5, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
};

/** A fern frond on transparent: a stalk with paired leaflets shrinking towards the tip. */
export const paintFrond: Painter = (context, size, random) => {
  const width = 128;
  const height = 384;
  context.strokeStyle = "#3d5a1c";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(width / 2, height);
  context.lineTo(width / 2, 6);
  context.stroke();
  for (let y = height - 20; y > 10; y -= 14) {
    const along = 1 - y / height;
    const reach = (width / 2 - 6) * Math.sin(Math.PI * Math.min(1, 0.25 + along * 0.85)) * (1 - along * 0.55);
    for (const side of [-1, 1]) {
      const shade = 90 + random() * 50;
      context.fillStyle = `rgb(${shade * 0.45},${shade},${shade * 0.3})`;
      context.save();
      context.translate(width / 2, y);
      context.rotate(side * -0.35);
      context.beginPath();
      context.ellipse((side * reach) / 2, 0, reach / 2, 5.5, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }
};

export const BARK: NoiseLook = { base: [62, 46, 32], dark: [30, 22, 16], light: [96, 78, 56], fadeOut: false };

export const LICHEN: NoiseLook = { base: [70, 104, 38], dark: [36, 58, 22], light: [124, 160, 66], fadeOut: false };

/** A dirt trail worn by her steps through the moss, fallen leaves and pebbles. */
const GLADE_GROUND: GroundDressing = {
  wash: { colour: "#4ade80", alpha: 0.25 },
  path: { kind: "dirt", colour: "rgba(110,84,52,0.9)", edge: "rgba(60,44,26,0.6)", width: [0.12, 0.24], wind: 0.06 },
  litter: [
    { shape: "leaf", colours: ["#c9a43a", "#8a5a24", "#6f9a2e"], count: 140, size: 5 },
    { shape: "pebble", colours: ["#77705f", "#5a5547"], count: 40, size: 3 },
  ],
};

export const paintGladeFloor = withDressing(paintMossFloor, GLADE_GROUND);
