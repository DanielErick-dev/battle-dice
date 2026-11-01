import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { type Painter } from "../kit/textures";

/** Soft snow over moss: pale blue-white with teal moss and lilac shadows showing through, and frost glints. */
const paintFrostMoss: Painter = (context, size, random) => {
  context.fillStyle = "#cfe7ef";
  context.fillRect(0, 0, size, size);
  const blot = (x: number, y: number, radius: number, colour: string) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  for (let index = 0; index < 120; index++) {
    blot(random() * size, random() * size, 10 + random() * 30, "rgba(62,150,140,0.4)");
  }
  for (let index = 0; index < 60; index++) {
    blot(random() * size, random() * size, 16 + random() * 34, "rgba(150,130,220,0.22)");
  }
  for (let index = 0; index < 160; index++) {
    blot(random() * size, random() * size, 12 + random() * 26, "rgba(246,252,255,0.7)");
  }
  for (let index = 0; index < 1400; index++) {
    context.fillStyle = random() < 0.7 ? "rgba(255,255,255,0.9)" : "rgba(160,240,255,0.8)";
    context.fillRect(random() * size, random() * size, 1 + random(), 1 + random());
  }
};

/** Five rounded petals, white at the heart and shading off at the tips (tinted per flower). */
export const paintPetals: Painter = (context, size) => {
  const centre = size / 2;
  for (let petal = 0; petal < 5; petal++) {
    context.save();
    context.translate(centre, centre);
    context.rotate((petal / 5) * Math.PI * 2);
    const gradient = context.createLinearGradient(0, 0, 0, -centre);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0.35)");
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(0, -centre * 0.48, centre * 0.27, centre * 0.46, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.fillStyle = "rgba(255,250,210,1)";
  context.beginPath();
  context.arc(centre, centre, size * 0.08, 0, Math.PI * 2);
  context.fill();
};

/** A soft glint with four long rays, white on transparent. */
export const paintStar: Painter = (context, size) => {
  const centre = size / 2;
  const core = context.createRadialGradient(centre, centre, 0, centre, centre, centre * 0.45);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = core;
  context.fillRect(0, 0, size, size);
  context.fillStyle = "rgba(255,255,255,0.85)";
  for (const turn of [0, Math.PI / 2]) {
    context.save();
    context.translate(centre, centre);
    context.rotate(turn);
    context.beginPath();
    context.moveTo(-centre, 0);
    context.quadraticCurveTo(0, -2, centre, 0);
    context.quadraticCurveTo(0, 2, -centre, 0);
    context.fill();
    context.restore();
  }
};

/** A trail of packed snow through the moss, ice shards and glints of fairy light. */
const GROVE_GROUND: GroundDressing = {
  wash: { colour: "#67e8f9", alpha: 0.3 },
  path: {
    kind: "dirt",
    colour: "rgba(240,250,255,0.9)",
    edge: "rgba(150,210,235,0.5)",
    width: [0.14, 0.24],
    wind: 0.05,
  },
  litter: [{ shape: "shard", colours: ["rgba(160,240,255,0.9)", "rgba(200,180,255,0.8)"], count: 90, size: 4 }],
  glow: { colour: "#9be7ff", count: 6 },
};

export const paintGroveFloor = withDressing(paintFrostMoss, GROVE_GROUND);
