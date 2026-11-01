import { seededRandom } from "@/game/domain/core/random";
import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { blot } from "../kit/painting";
import { type CanvasLook, type NoiseLook, type Painter } from "../kit/textures";

/**
 * The seabed he rules: rippled blue-green sand, seagrass meadows, his gold sigil round his feet and a few temple
 * tiles half sunk in the sand, their gold inlay still catching the light.
 */
const drawSeabed: Painter = (context, size, random) => {
  context.fillStyle = "#123b4a";
  context.fillRect(0, 0, size, size);
  for (let patch = 0; patch < 70; patch++) {
    const light = random() < 0.55;
    blot(
      context,
      random() * size,
      random() * size,
      20 + random() * 50,
      light ? "rgba(90,170,170,0.35)" : "rgba(8,30,50,0.45)",
    );
  }
  // Sand ripples: wavy bands the current combs across the bed.
  context.lineCap = "round";
  for (let band = 0; band < 46; band++) {
    const y = (band / 46) * size + random() * 6;
    context.strokeStyle = band % 2 ? "rgba(150,210,205,0.22)" : "rgba(6,24,36,0.3)";
    context.lineWidth = 2 + random() * 2;
    context.beginPath();
    for (let x = 0; x <= size; x += 16) {
      const wave = Math.sin(x * 0.03 + band * 0.9) * 5;
      if (x === 0) context.moveTo(x, y + wave);
      else context.lineTo(x, y + wave);
    }
    context.stroke();
  }
  for (let meadow = 0; meadow < 26; meadow++) {
    blot(context, random() * size, random() * size, 12 + random() * 26, "rgba(40,140,90,0.45)");
  }
  // Half-sunk tiles: a corner showing, gold inlay along its edge.
  for (let tile = 0; tile < 9; tile++) {
    const x = random() * size;
    const y = random() * size;
    context.save();
    context.translate(x, y);
    context.rotate(random() * Math.PI);
    context.fillStyle = "rgba(70,110,110,0.85)";
    context.fillRect(-22, -22, 44, 44);
    context.strokeStyle = "rgba(226,176,64,0.9)";
    context.lineWidth = 2.5;
    context.strokeRect(-18, -18, 36, 36);
    context.restore();
    blot(context, x + 14, y + 10, 30, "rgba(110,180,175,0.6)");
  }
  const centre = size / 2;
  context.strokeStyle = "rgba(240,190,80,0.9)";
  context.lineWidth = 4;
  [0.36, 0.42].forEach((share) => {
    context.beginPath();
    context.arc(centre, centre, centre * share, 0, Math.PI * 2);
    context.stroke();
  });
  context.lineWidth = 2.5;
  for (let ray = 0; ray < 16; ray++) {
    const angle = (ray / 16) * Math.PI * 2;
    const outer = centre * (ray % 2 ? 0.5 : 0.56);
    context.beginPath();
    context.moveTo(centre + Math.cos(angle) * centre * 0.42, centre + Math.sin(angle) * centre * 0.42);
    context.lineTo(centre + Math.cos(angle) * outer, centre + Math.sin(angle) * outer);
    context.stroke();
  }
  for (let fleck = 0; fleck < 3000; fleck++) {
    context.fillStyle = random() < 0.5 ? "rgba(4,16,24,0.3)" : "rgba(170,225,220,0.2)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
};

/** A tiling net of bright lines: where each point is about as near two cells of a scattered grid (Voronoi edges). */
function drawCaustics(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(71);
  const cells = Array.from({ length: 22 }, () => [random() * size, random() * size]);
  const image = context.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let nearest = Infinity;
      let second = Infinity;
      for (const [cx, cy] of cells) {
        // Measured around the wrap, so the pattern tiles.
        const dx = Math.min(Math.abs(px - cx), size - Math.abs(px - cx));
        const dy = Math.min(Math.abs(py - cy), size - Math.abs(py - cy));
        const distance = Math.hypot(dx, dy);
        if (distance < nearest) [second, nearest] = [nearest, distance];
        else if (distance < second) second = distance;
      }
      const value = Math.round(255 * Math.exp(-(second - nearest) / 3.5));
      const at = (py * size + px) * 4;
      image.data[at] = image.data[at + 1] = image.data[at + 2] = value;
      image.data[at + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}

function drawMask(context: CanvasRenderingContext2D, size: number) {
  const fade = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  fade.addColorStop(0, "#ffffff");
  fade.addColorStop(0.55, "#b0b0b0");
  fade.addColorStop(1, "#000000");
  context.fillStyle = fade;
  context.fillRect(0, 0, size, size);
}

/** Ribs fanning out from the foot, crossed by arcs, on transparent: cut out with alphaTest. */
function drawLattice(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 3;
  for (let rib = 0; rib <= 12; rib++) {
    const angle = Math.PI + (rib / 12) * Math.PI;
    context.beginPath();
    context.moveTo(centre, centre);
    context.lineTo(centre + Math.cos(angle) * centre, centre + Math.sin(angle) * centre);
    context.stroke();
  }
  context.lineWidth = 2;
  for (let arc = 1; arc <= 7; arc++) {
    context.beginPath();
    context.arc(centre, centre, (arc / 7) * centre * 0.98, Math.PI, Math.PI * 2);
    context.stroke();
  }
}

/** A thin bright ring with a highlight, so additive points read as bubbles rather than dots. */
function drawBubble(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  context.strokeStyle = "rgba(255,255,255,0.9)";
  context.lineWidth = size * 0.08;
  context.beginPath();
  context.arc(centre, centre, centre * 0.8, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = "rgba(255,255,255,0.9)";
  context.beginPath();
  context.arc(centre - centre * 0.3, centre - centre * 0.3, centre * 0.16, 0, Math.PI * 2);
  context.fill();
}

/** A trail of pale sand to the pillars, coins and shells strewn over it, a sea-blue sheen. */
const TEMPLE_GROUND: GroundDressing = {
  wash: { colour: "#0ea5e9", alpha: 0.3 },
  path: {
    kind: "dirt",
    colour: "rgba(190,220,200,0.55)",
    edge: "rgba(90,150,150,0.35)",
    width: [0.14, 0.26],
    wind: 0.05,
  },
  litter: [
    { shape: "coin", colours: ["#f5c542", "#d4a12a"], count: 50, size: 4 },
    { shape: "pebble", colours: ["#e8dcc0", "#cfc0a0"], count: 30, size: 3 },
  ],
};

export const TILES: CanvasLook = { size: 512, draw: withDressing(drawSeabed, TEMPLE_GROUND), seed: 43, fadeFrom: 0.55 };

export const CAUSTICS: CanvasLook = { size: 256, draw: drawCaustics, tile: true };

export const MASK: CanvasLook = { size: 128, draw: drawMask, linear: true };

export const LATTICE: CanvasLook = { size: 256, draw: drawLattice };

export const BUBBLE: CanvasLook = { size: 32, draw: drawBubble };

export const GILT: NoiseLook = {
  base: [212, 160, 58],
  dark: [96, 110, 60],
  light: [250, 214, 120],
  fadeOut: false,
};
