import { seededRandom } from "@/game/domain/core/random";
import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { speckle } from "../kit/painting";

interface Crack {
  points: [number, number][];
  width: number;
}

/** Rifts running out from under his feet and branching on the way, in canvas units (0 to 1). */
function crackPaths(): { rifts: Crack[]; branches: Crack[] } {
  const random = seededRandom(47);
  const rifts: Crack[] = [];
  const branches: Crack[] = [];
  const walk = (x: number, y: number, angle: number, width: number, steps: number, depth: number) => {
    const points: [number, number][] = [[x, y]];
    for (let step = 0; step < steps; step++) {
      angle += (random() - 0.5) * 0.7;
      x += Math.cos(angle) * 0.022;
      y += Math.sin(angle) * 0.022;
      points.push([x, y]);
      if (Math.hypot(x - 0.5, y - 0.5) > 0.47) break;
      if (depth < 2 && random() < 0.11)
        walk(
          x,
          y,
          angle + (random() < 0.5 ? 1 : -1) * (0.5 + random() * 0.5),
          width * 0.55,
          6 + random() * 10,
          depth + 1,
        );
    }
    (depth === 0 ? rifts : branches).push({ points, width });
  };
  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2 + random() * 0.5;
    const start = 0.04 + random() * 0.06;
    walk(0.5 + Math.cos(angle) * start, 0.5 + Math.sin(angle) * start, angle, 5 + random() * 3, 40, 0);
  }
  return { rifts, branches };
}

const CRACKS = crackPaths();

function strokeCracks(context: CanvasRenderingContext2D, size: number, cracks: Crack[], widen: number) {
  context.lineCap = context.lineJoin = "round";
  cracks.forEach(({ points, width }) => {
    // Each crack thins as it runs out, drawn a segment at a time.
    for (let index = 1; index < points.length; index++) {
      context.lineWidth = Math.max(0.6, width * (1 - (index / points.length) * 0.75)) * widen;
      context.beginPath();
      context.moveTo(points[index - 1][0] * size, points[index - 1][1] * size);
      context.lineTo(points[index][0] * size, points[index][1] * size);
      context.stroke();
    }
  });
}

/** Black glassy stone in broad facets, the rifts cut into it as dark grooves. */
function paintObsidian(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(43);
  context.fillStyle = "#07060b";
  context.fillRect(0, 0, size, size);
  for (let facet = 0; facet < 160; facet++) {
    const [x, y] = [random() * size, random() * size];
    const reach = 30 + random() * 70;
    context.fillStyle = `rgba(${130 + random() * 40},${110 + random() * 30},200,${0.02 + random() * 0.05})`;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * reach * 2, y + (random() - 0.5) * reach * 2);
    context.lineTo(x + (random() - 0.5) * reach * 2, y + (random() - 0.5) * reach * 2);
    context.fill();
  }
  speckle(context, size, random, {
    count: 1800,
    odds: 0.6,
    colours: ["rgba(0,0,0,0.5)", "rgba(150,130,200,0.12)"],
    spread: 2,
  });
  context.strokeStyle = "#1a0d2e";
  strokeCracks(context, size, [...CRACKS.rifts, ...CRACKS.branches], 2.2);
}

/** The light inside the main rifts: a wide haze, then a bright core. White, tinted by the material. */
export function paintFissures(context: CanvasRenderingContext2D, size: number) {
  context.strokeStyle = "rgba(255,255,255,0.12)";
  strokeCracks(context, size, CRACKS.rifts, 4);
  context.strokeStyle = "rgba(255,255,255,0.9)";
  strokeCracks(context, size, CRACKS.rifts, 0.9);
}

export function paintVeins(context: CanvasRenderingContext2D, size: number) {
  context.strokeStyle = "rgba(255,255,255,0.12)";
  strokeCracks(context, size, CRACKS.branches, 4);
  context.strokeStyle = "rgba(255,255,255,0.8)";
  strokeCracks(context, size, CRACKS.branches, 0.9);
}

/** Three arms of soft smoke curling into the centre, white on transparent. */
export function paintVortex(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(53);
  const centre = size / 2;
  const puffs = 240;
  for (let arm = 0; arm < 3; arm++) {
    for (let index = 0; index < puffs; index++) {
      const along = index / puffs;
      const angle = (arm / 3) * Math.PI * 2 + along * 5.5 + (random() - 0.5) * 0.3;
      const radius = (0.06 + along * 0.4) * size;
      const x = centre + Math.cos(angle) * radius;
      const y = centre + Math.sin(angle) * radius;
      const puff = (2 + along * 14) * (0.6 + random() * 0.8);
      const gradient = context.createRadialGradient(x, y, 0, x, y, puff);
      // Thickest mid-way out, thinning to nothing at both ends of the arm.
      const alpha = 0.16 * Math.sin(along * Math.PI);
      gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(x - puff, y - puff, puff * 2, puff * 2);
    }
  }
}

/** Obsidian slabs leading into the rift, glowing violet at the joints, shards of void glass. */
const RIFT_GROUND: GroundDressing = {
  wash: { colour: "#7c3aed", alpha: 0.35 },
  path: { kind: "slabs", colour: "#2a1f3d", edge: "#8b5cf6", width: [0.15, 0.25] },
  litter: [{ shape: "shard", colours: ["rgba(190,140,255,0.85)", "rgba(40,20,70,0.9)"], count: 80, size: 5 }],
  glow: { colour: "#b06cff", count: 12 },
};
export const paintRiftFloor = withDressing(paintObsidian, RIFT_GROUND);
