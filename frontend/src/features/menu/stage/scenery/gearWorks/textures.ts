import { seededRandom } from "@/game/domain/core/random";
import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { type CanvasLook, type NoiseLook } from "../kit/textures";
import { CLOCK_BAND, CLOCK_RADIUS } from "./layout";

/** Riveted iron plates, scuffed and oiled, fading out towards the rim. */
function drawPlates(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(83);
  const plate = 128;
  context.fillStyle = "#120e0a";
  context.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += plate) {
    for (let x = 0; x < size; x += plate) {
      const shade = 50 + random() * 20;
      context.fillStyle = `rgb(${shade + 14},${shade + 4},${shade - 8})`;
      context.fillRect(x + 3, y + 3, plate - 6, plate - 6);
      context.fillStyle = "rgba(200,150,80,0.55)";
      for (const [rx, ry] of [
        [12, 12],
        [plate - 12, 12],
        [12, plate - 12],
        [plate - 12, plate - 12],
        [plate / 2, 12],
        [plate / 2, plate - 12],
      ]) {
        context.beginPath();
        context.arc(x + rx, y + ry, 3.5, 0, Math.PI * 2);
        context.fill();
      }
    }
  }
  for (let scratch = 0; scratch < 120; scratch++) {
    const x = random() * size;
    const y = random() * size;
    const angle = random() * Math.PI;
    const length = 6 + random() * 30;
    context.strokeStyle = `rgba(190,150,100,${0.08 + random() * 0.15})`;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.stroke();
  }
  for (let stain = 0; stain < 18; stain++) {
    const x = random() * size;
    const y = random() * size;
    const radius = 14 + random() * 36;
    const oil = context.createRadialGradient(x, y, 0, x, y, radius);
    oil.addColorStop(0, "rgba(10,6,4,0.45)");
    oil.addColorStop(1, "rgba(10,6,4,0)");
    context.fillStyle = oil;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

/** Roman numerals and minute ticks round the band of the dial (the ring's UVs span its outer square). */
function drawNumerals(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  context.fillStyle = "#2a1c10";
  context.fillRect(0, 0, size, size);
  const outer = centre;
  const inner = centre * ((CLOCK_RADIUS - CLOCK_BAND) / CLOCK_RADIUS);
  const numerals = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
  context.fillStyle = "#ffd27a";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `bold ${Math.round((outer - inner) * 0.5)}px Georgia, serif`;
  numerals.forEach((numeral, index) => {
    const angle = (index / 12) * Math.PI * 2;
    const radius = (inner + outer) / 2 - (outer - inner) * 0.06;
    context.save();
    context.translate(centre + Math.sin(angle) * radius, centre - Math.cos(angle) * radius);
    context.rotate(angle);
    context.fillText(numeral, 0, 0);
    context.restore();
  });
  context.strokeStyle = "#ffd27a";
  for (let tick = 0; tick < 60; tick++) {
    const angle = (tick / 60) * Math.PI * 2;
    const length = tick % 5 ? (outer - inner) * 0.1 : (outer - inner) * 0.2;
    context.lineWidth = tick % 5 ? 1.5 : 3;
    context.beginPath();
    context.moveTo(centre + Math.sin(angle) * (outer - 3), centre - Math.cos(angle) * (outer - 3));
    context.lineTo(centre + Math.sin(angle) * (outer - 3 - length), centre - Math.cos(angle) * (outer - 3 - length));
    context.stroke();
  }
}

/** A brass walkway riveted across the plates to the clock, bolts dropped about and seams glowing like a furnace. */
const WORKS_GROUND: GroundDressing = {
  wash: { colour: "#f59e0b", alpha: 0.25 },
  path: { kind: "boards", colour: "#8a6a35", edge: "#2b2116", width: [0.17, 0.25], wind: 0 },
  litter: [{ shape: "speck", colours: ["#c8a050", "#6b5636"], count: 70, size: 3 }],
  glow: { colour: "#ffb347", count: 5 },
};

export const PLATES: CanvasLook = { size: 512, draw: withDressing(drawPlates, WORKS_GROUND), fadeFrom: 0.5 };

export const NUMERALS: CanvasLook = { size: 1024, draw: drawNumerals };

export const WEAR: NoiseLook = {
  base: [200, 170, 130],
  dark: [110, 84, 56],
  light: [240, 222, 190],
  fadeOut: false,
};
