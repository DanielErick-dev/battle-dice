import { seededRandom } from "@/game/domain/random";
import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { type CanvasLook } from "../kit/textures";

/** Across-corners radius of a floor hex, in canvas pixels. */
const HEX = 26;

/** Calls `trace` with the corners of every hex of a flat-topped grid covering the canvas. */
function eachHex(size: number, trace: (corners: [number, number][], index: number) => void) {
  const across = HEX * 1.5;
  const down = HEX * Math.sqrt(3);
  let index = 0;
  for (let column = -1; column * across < size + HEX; column++) {
    for (let row = -1; row * down < size + HEX; row++) {
      const cx = column * across;
      const cy = row * down + (column % 2 ? down / 2 : 0);
      const corners = Array.from({ length: 6 }, (_, corner): [number, number] => {
        const angle = (corner / 6) * Math.PI * 2;
        return [cx + Math.cos(angle) * HEX, cy + Math.sin(angle) * HEX];
      });
      trace(corners, index++);
    }
  }
}

function hexPath(context: CanvasRenderingContext2D, corners: [number, number][]) {
  context.beginPath();
  corners.forEach(([x, y], corner) => (corner ? context.lineTo(x, y) : context.moveTo(x, y)));
  context.closePath();
}

/** Gunmetal hex plates, each its own shade with a lit upper edge, a bolt and scuffs. */
function drawDeck(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(97);
  context.fillStyle = "#0b0e12";
  context.fillRect(0, 0, size, size);
  eachHex(size, (corners) => {
    const shade = 48 + random() * 22;
    hexPath(context, corners);
    context.fillStyle = `rgb(${shade - 4},${shade + 2},${shade + 10})`;
    context.fill();
    context.strokeStyle = "rgba(170,186,206,0.35)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(...corners[3]);
    [4, 5, 0].forEach((corner) => context.lineTo(...corners[corner]));
    context.stroke();
    const [x, y] = corners.reduce(([sx, sy], [px, py]) => [sx + px / 6, sy + py / 6], [0, 0]);
    if (random() < 0.4) {
      context.fillStyle = "rgba(20,24,30,0.8)";
      context.beginPath();
      context.arc(x, y, 2.5, 0, Math.PI * 2);
      context.fill();
    }
  });
  for (let fleck = 0; fleck < 2400; fleck++) {
    context.fillStyle = random() < 0.5 ? "rgba(8,10,14,0.3)" : "rgba(150,166,186,0.15)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1);
  }
}

/** Just the joints between the deck's hexes, white on black, for the scan shader. */
function drawSeams(context: CanvasRenderingContext2D, size: number) {
  context.fillStyle = "#000000";
  context.fillRect(0, 0, size, size);
  context.strokeStyle = "#ffffff";
  context.lineWidth = 2.5;
  eachHex(size, (corners) => {
    hexPath(context, corners);
    context.stroke();
  });
}

/** The pad's face: brushed steel, alignment rings and the unit's mark. */
function drawPad(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(101);
  const centre = size / 2;
  context.fillStyle = "#5c6574";
  context.fillRect(0, 0, size, size);
  for (let stroke = 0; stroke < 260; stroke++) {
    const radius = random() * centre;
    context.strokeStyle = `rgba(${random() < 0.5 ? "30,36,44" : "190,200,214"},0.12)`;
    context.beginPath();
    context.arc(centre, centre, radius, random() * 6, random() * 6 + 1.5);
    context.stroke();
  }
  context.strokeStyle = "rgba(220,232,245,0.7)";
  [0.92, 0.86, 0.4].forEach((share, index) => {
    context.lineWidth = index === 1 ? 2 : 5;
    context.beginPath();
    context.arc(centre, centre, centre * share, 0, Math.PI * 2);
    context.stroke();
  });
  context.lineWidth = 6;
  for (let tick = 0; tick < 4; tick++) {
    const angle = (tick / 4) * Math.PI * 2 + Math.PI / 4;
    context.beginPath();
    context.moveTo(centre + Math.cos(angle) * centre * 0.55, centre + Math.sin(angle) * centre * 0.55);
    context.lineTo(centre + Math.cos(angle) * centre * 0.8, centre + Math.sin(angle) * centre * 0.8);
    context.stroke();
  }
  context.fillStyle = "rgba(230,240,250,0.75)";
  context.font = `bold ${Math.round(size * 0.06)}px monospace`;
  context.textAlign = "center";
  context.fillText("ALVA-01", centre, centre + centre * 0.72);
}

/** Yellow and black wedges, slanted, so the ring reads as hazard tape all the way round. */
function drawHazard(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  const wedges = 64;
  context.fillStyle = "#15130e";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#f2c230";
  for (let wedge = 0; wedge < wedges; wedge += 2) {
    const from = (wedge / wedges) * Math.PI * 2;
    const to = ((wedge + 1) / wedges) * Math.PI * 2;
    const slant = (0.8 / wedges) * Math.PI * 2;
    const inner = centre * 0.8;
    context.beginPath();
    context.moveTo(centre + Math.cos(from) * inner, centre + Math.sin(from) * inner);
    context.lineTo(centre + Math.cos(from + slant) * centre, centre + Math.sin(from + slant) * centre);
    context.lineTo(centre + Math.cos(to + slant) * centre, centre + Math.sin(to + slant) * centre);
    context.lineTo(centre + Math.cos(to) * inner, centre + Math.sin(to) * inner);
    context.closePath();
    context.fill();
  }
}

/** A steel crate face: frame, cross braces, a stencilled number and hazard corners. */
function drawCrate(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(107);
  context.fillStyle = "#c9ced6";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#3a4250";
  const frame = size * 0.08;
  context.fillRect(0, 0, size, frame);
  context.fillRect(0, size - frame, size, frame);
  context.fillRect(0, 0, frame, size);
  context.fillRect(size - frame, 0, frame, size);
  context.strokeStyle = "rgba(58,66,80,0.6)";
  context.lineWidth = size * 0.03;
  context.beginPath();
  context.moveTo(frame, frame);
  context.lineTo(size - frame, size - frame);
  context.stroke();
  context.fillStyle = "#e0a91f";
  for (const [x, y] of [
    [frame, frame],
    [size - frame * 3, size - frame * 3],
  ]) {
    context.fillRect(x, y, frame * 2, frame * 2);
  }
  context.fillStyle = "rgba(30,34,42,0.85)";
  context.font = `bold ${Math.round(size * 0.22)}px monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("07", size * 0.62, size * 0.38);
  for (let fleck = 0; fleck < 500; fleck++) {
    context.fillStyle = random() < 0.5 ? "rgba(40,44,52,0.2)" : "rgba(255,255,255,0.2)";
    context.fillRect(random() * size, random() * size, 1 + random() * 3, 1);
  }
}

/** Rows of telemetry bars and a target box, tiling vertically so it can scroll. */
function drawScreen(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(109);
  context.fillStyle = "#04121c";
  context.fillRect(0, 0, size, size);
  const row = size / 16;
  for (let line = 0; line < 16; line++) {
    context.fillStyle = `rgba(120,230,255,${0.4 + random() * 0.5})`;
    let x = row * 0.5;
    while (x < size * (0.4 + random() * 0.55)) {
      const width = row * (0.5 + random() * 2.5);
      context.fillRect(x, line * row + row * 0.3, width, row * 0.4);
      x += width + row * 0.4;
    }
  }
  context.strokeStyle = "rgba(255,90,100,0.9)";
  context.lineWidth = 3;
  context.strokeRect(size * 0.68, size * 0.2, size * 0.22, size * 0.22);
}

/** The outer ring of the reticle: a dashed circle, a solid one and ticks at the quarters. */
function drawReticleRing(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 4;
  context.setLineDash([size * 0.06, size * 0.035]);
  context.beginPath();
  context.arc(centre, centre, centre * 0.92, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  context.lineWidth = 2;
  context.beginPath();
  context.arc(centre, centre, centre * 0.78, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 5;
  for (let tick = 0; tick < 4; tick++) {
    const angle = (tick / 4) * Math.PI * 2;
    context.beginPath();
    context.moveTo(centre + Math.cos(angle) * centre * 0.62, centre + Math.sin(angle) * centre * 0.62);
    context.lineTo(centre + Math.cos(angle) * centre * 0.86, centre + Math.sin(angle) * centre * 0.86);
    context.stroke();
  }
}

/** Four corner brackets closing on a centre diamond. */
function drawReticleBrackets(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  const reach = size * 0.42;
  const arm = size * 0.16;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 6;
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const x = centre + sx * reach;
    const y = centre + sy * reach;
    context.beginPath();
    context.moveTo(x - sx * arm, y);
    context.lineTo(x, y);
    context.lineTo(x, y - sy * arm);
    context.stroke();
  }
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(centre, centre - 10);
  context.lineTo(centre + 10, centre);
  context.lineTo(centre, centre + 10);
  context.lineTo(centre - 10, centre);
  context.closePath();
  context.fill();
}

/** Yellow guide lines and chevrons on the deck, leading back into the bay. */
const HANGAR_GROUND: GroundDressing = {
  wash: { colour: "#8ecbff", alpha: 0.22 },
  path: { kind: "lines", colour: "rgba(255,204,51,0.85)", edge: "rgba(255,204,51,0.9)", width: [0.2, 0.3], wind: 0 },
  litter: [{ shape: "speck", colours: ["rgba(200,215,230,0.6)"], count: 60, size: 2 }],
};

export const DECK: CanvasLook = { size: 512, draw: withDressing(drawDeck, HANGAR_GROUND), fadeFrom: 0.5 };

export const SEAMS: CanvasLook = { size: 512, draw: drawSeams, linear: true };

export const PAD: CanvasLook = { size: 512, draw: drawPad };

export const HAZARD: CanvasLook = { size: 512, draw: drawHazard };

export const CRATE: CanvasLook = { size: 256, draw: drawCrate };

export const SCREEN: CanvasLook = { size: 256, draw: drawScreen, tile: true };

export const RETICLE_RING: CanvasLook = { size: 256, draw: drawReticleRing };

export const RETICLE_BRACKETS: CanvasLook = { size: 256, draw: drawReticleBrackets };
