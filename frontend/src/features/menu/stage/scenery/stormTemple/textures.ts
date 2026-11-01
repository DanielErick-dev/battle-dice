import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { type NoiseLook, type Painter } from "../kit/textures";

/** Big square slabs worn smooth in the middle, mossy joints and cracks, fading out towards the rim. */
const paintTerraceSlabs: Painter = (context, size, random) => {
  context.fillStyle = "#3f4a32";
  context.fillRect(0, 0, size, size);
  const slab = 92;
  for (let row = -1; row * slab < size; row++) {
    const offset = row % 2 ? slab / 2 : 0;
    for (let column = -1; column * slab < size + slab; column++) {
      const shade = 112 + random() * 34;
      context.fillStyle = `rgb(${shade + 6},${shade},${shade - 10})`;
      context.fillRect(column * slab + offset + 3, row * slab + 3, slab - 6, slab - 6);
    }
  }
  for (let crack = 0; crack < 18; crack++) {
    let x = random() * size;
    let y = random() * size;
    let angle = random() * Math.PI * 2;
    context.strokeStyle = "rgba(40,38,32,0.55)";
    context.lineWidth = 1 + random();
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 4; step++) {
      angle += (random() - 0.5) * 1.2;
      x += Math.cos(angle) * 14;
      y += Math.sin(angle) * 14;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  for (let fleck = 0; fleck < 3600; fleck++) {
    context.fillStyle = random() < 0.5 ? "rgba(50,46,40,0.3)" : "rgba(200,192,176,0.25)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  // Paler where generations of feet have trained on it.
  const worn = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.3);
  worn.addColorStop(0, "rgba(214,206,186,0.35)");
  worn.addColorStop(1, "rgba(214,206,186,0)");
  context.fillStyle = worn;
  context.fillRect(0, 0, size, size);
};

export const STONE: NoiseLook = { base: [124, 118, 104], dark: [70, 66, 58], light: [168, 162, 146], fadeOut: false };

/** A saffron prayer carpet across the terrace, marigold petals, and cracks still crackling from the storm. */
const TERRACE_GROUND: GroundDressing = {
  wash: { colour: "#facc15", alpha: 0.2 },
  path: { kind: "runner", colour: "#b4531f", edge: "#f2c14e", width: [0.2, 0.2] },
  litter: [{ shape: "petal", colours: ["#f59e0b", "#fbbf24", "#ea580c"], count: 90, size: 4 }],
  glow: { colour: "#7dd3fc", count: 5 },
};

export const paintTerraceFloor = withDressing(paintTerraceSlabs, TERRACE_GROUND);
