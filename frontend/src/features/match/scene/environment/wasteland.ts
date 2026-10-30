import { seededRandom } from "@/game/domain/random";
import { START_PLAZA, TILE_PITCH, type Vec3 } from "../boardLayout";
import { TRAIL_GROUND } from "./islandTerrain";
import type { KitItem } from "./kits";

/** Room between the trail and the edge of the ruins. */
const MARGIN = { side: 9, back: 8, front: 5 };
const SHADE_REACH = 1.15;
const FLOOR = TRAIL_GROUND;

/** Each piece's world scale (the kits come at different sizes) and its kit size (width, height, depth). */
const PIECES: Record<string, { scale: number; size: [number, number, number] }> = {
  "wall-broken-type-a": { scale: 3.5, size: [1, 0.4, 0.07] },
  "wall-broken-type-b": { scale: 3.5, size: [1, 0.5, 0.07] },
  "wall-a-flat-window": { scale: 3.5, size: [1, 1, 0.1] },
  "wall-b-flat-window": { scale: 3.5, size: [1, 1, 0.1] },
  "wall-a-corner": { scale: 3.5, size: [1, 1, 1] },
  "scaffolding-structure": { scale: 3.5, size: [1, 1, 1] },
  "detail-dumpster-open": { scale: 3, size: [0.6, 0.55, 0.48] },
  "detail-barrier-strong-damaged": { scale: 3, size: [0.66, 0.33, 0.25] },
  "detail-barrier-type-a": { scale: 3, size: [0.43, 0.4, 0.13] },
  "detail-light-single": { scale: 4, size: [0.09, 0.96, 0.26] },
  "truck-grey": { scale: 2.6, size: [0.83, 1.01, 1.64] },
  "truck-green-cargo": { scale: 2.6, size: [0.83, 0.74, 1.17] },
  pallet: { scale: 1.6, size: [1, 0.15, 1] },
  planks: { scale: 1.6, size: [1.13, 0.1, 0.57] },
  sedan: { scale: 1.3, size: [1.5, 1.3, 2.55] },
  suv: { scale: 1.3, size: [1.5, 1.3, 2.7] },
  taxi: { scale: 1.3, size: [1.5, 1.5, 2.75] },
  police: { scale: 1.3, size: [1.5, 1.3, 3.1] },
  van: { scale: 1.3, size: [1.5, 1.35, 2.75] },
  ambulance: { scale: 1.3, size: [1.5, 1.8, 3.25] },
  "debris-tire": { scale: 1.3, size: [0.35, 0.6, 0.6] },
  "debris-door": { scale: 1.3, size: [0.19, 0.9, 0.8] },
  "debris-bumper": { scale: 1.3, size: [1.3, 0.4, 0.45] },
  cone: { scale: 1.3, size: [0.48, 0.6, 0.48] },
  "pine-crooked": { scale: 2.4, size: [1.18, 2.11, 1.33] },
  "pine-fall-crooked": { scale: 2.4, size: [1.18, 2.11, 1.33] },
  "gravestone-broken": { scale: 2.4, size: [0.51, 0.34, 0.39] },
  "iron-fence-damaged": { scale: 2.4, size: [1, 0.88, 0.32] },
  "fire-basket": { scale: 3, size: [0.42, 0.17, 0.42] },
  debris: { scale: 3, size: [0.54, 0.16, 0.55] },
  "debris-wood": { scale: 3, size: [0.46, 0.1, 0.5] },
  rocks: { scale: 2.4, size: [1.08, 0.38, 0.96] },
  barrel: { scale: 3, size: [0.24, 0.34, 0.24] },
  "structure-metal": { scale: 5, size: [0.54, 0.5, 0.54] },
  "metal-panel": { scale: 4, size: [0.5, 0.5, 0.05] },
  "tent-canvas": { scale: 4.5, size: [0.56, 0.49, 0.56] },
  "campfire-pit": { scale: 3, size: [0.28, 0.11, 0.27] },
  "fence-fortified": { scale: 4, size: [0.5, 0.52, 0.05] },
  signpost: { scale: 3.5, size: [0.21, 0.46, 0.04] },
  "tree-trunk": { scale: 4, size: [0.2, 0.26, 0.2] },
};
export const WRECKS = new Set([
  "sedan",
  "suv",
  "taxi",
  "police",
  "van",
  "ambulance",
  "truck-grey",
  "truck-green-cargo",
]);
/** Odds and ends of the end of the world, and how often each turns up. */
const SCATTER: readonly [string, number][] = [
  ["debris", 4],
  ["debris-wood", 3],
  ["rocks", 3],
  ["debris-tire", 3],
  ["debris-door", 2],
  ["debris-bumper", 2],
  ["cone", 2],
  ["barrel", 3],
  ["pine-crooked", 3],
  ["pine-fall-crooked", 2],
  ["gravestone-broken", 2],
  ["iron-fence-damaged", 2],
  ["detail-barrier-strong-damaged", 2],
  ["detail-barrier-type-a", 2],
  ["detail-dumpster-open", 2],
  ["detail-light-single", 2],
  ["fire-basket", 2],
  ["structure-metal", 2],
  ["tent-canvas", 2],
  ["fence-fortified", 2],
  ["metal-panel", 2],
  ["pallet", 2],
  ["planks", 2],
  ["tree-trunk", 2],
  ["signpost", 1],
];

export interface WastelandPlan {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  pieces: KitItem[];
  /** The rusted wrecks, drawn darker apart from the rest. */
  wrecks: KitItem[];
  fires: Vec3[];
}

/**
 * A ruined city round the trail: shells of buildings along the back and the sides, wrecked cars left
 * by the road, debris, dead trees, barricades, shacks and fires burning in baskets. Nothing hides a
 * tile from the camera. The same every time.
 */
export function planWasteland(trail: readonly Vec3[]): WastelandPlan {
  const random = seededRandom(67);
  const xs = trail.map(([x]) => x);
  const zs = trail.map(([, , z]) => z);
  const bounds = {
    minX: Math.min(...xs) - MARGIN.side,
    maxX: Math.max(...xs) + MARGIN.side,
    minZ: Math.min(...zs) - MARGIN.back,
    maxZ: Math.max(...zs) + MARGIN.front,
  };
  const { minX, maxX, minZ, maxZ } = bounds;
  const pieces: KitItem[] = [];
  const wrecks: KitItem[] = [];
  const fires: Vec3[] = [];
  const taken: { x: number; z: number; radius: number }[] = [];
  const segments = trail.slice(1).map((to, index) => [trail[index], to] as const);
  const nearest = (x: number, z: number) => {
    let best = { distance: Infinity, dx: 1, dz: 0 };
    for (const [a, b] of segments) {
      const [dx, dz] = [b[0] - a[0], b[2] - a[2]];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz || 1)));
      const distance = Math.hypot(x - a[0] - dx * t, z - a[2] - dz * t);
      if (distance < best.distance) best = { distance, dx, dz };
    }
    return best;
  };
  const clearOfStart = (x: number, z: number, radius: number) =>
    Math.hypot(x - trail[0][0], z - trail[0][2]) > START_PLAZA + TILE_PITCH + radius;
  const hidesTiles = (x: number, z: number, height: number, spread: number) =>
    trail.some(([tx, , tz]) => tz < z + 1 && z - tz < height * SHADE_REACH && Math.abs(tx - x) < spread + 1.4);
  const free = (x: number, z: number, radius: number) =>
    taken.every((other) => Math.hypot(other.x - x, other.z - z) > other.radius + radius + 0.3);
  const put = (list: KitItem[], piece: string, x: number, z: number, turn: number, y = FLOOR) => {
    const { scale, size } = PIECES[piece];
    list.push({ piece, x, y, z, turn, scale });
    taken.push({ x, z, radius: (Math.max(size[0], size[2]) / 2) * scale });
  };

  // Ruined blocks round the edge: a corner and broken walls, a storey or two of windows, some scaffolding.
  const storey = 3.5;
  const ruin = (x: number, z: number, turn: number) => {
    const [cos, sin] = [Math.cos(turn), Math.sin(turn)];
    const at = (along: number, across: number): [number, number] => [
      x + cos * along + sin * across,
      z - sin * along + cos * across,
    ];
    const floors = 1 + Math.floor(random() * 2);
    for (let level = 0; level < floors; level++) {
      for (let step = 0; step < 3; step++) {
        const [wx, wz] = at(step * storey, 0);
        const piece =
          level === floors - 1 && random() < 0.5
            ? "wall-broken-type-a"
            : random() < 0.5
              ? "wall-a-flat-window"
              : "wall-b-flat-window";
        pieces.push({ piece, x: wx, y: FLOOR + level * storey, z: wz, turn, scale: storey });
        const [sx, sz] = at(0, step * storey);
        pieces.push({
          piece: random() < 0.3 ? "wall-broken-type-b" : "wall-a-flat-window",
          x: sx,
          y: FLOOR + level * storey,
          z: sz,
          turn: turn + Math.PI / 2,
          scale: storey,
        });
      }
    }
    if (random() < 0.5) {
      const [px, pz] = at(storey * 2, storey);
      pieces.push({ piece: "scaffolding-structure", x: px, y: FLOOR, z: pz, turn, scale: storey });
    }
    taken.push({ x: x + (cos + sin) * storey, z: z + (cos - sin) * storey, radius: storey * 2.2 });
  };
  for (let attempt = 0; attempt < 300; attempt++) {
    const side = random();
    const [x, z] =
      side < 0.4
        ? [minX + 2 + random() * (maxX - minX - 10), minZ + 1 + random() * 3]
        : side < 0.7
          ? [minX + 1 + random() * 3, minZ + 4 + random() * (maxZ - minZ - 12)]
          : [maxX - 9 - random() * 3, minZ + 4 + random() * (maxZ - minZ - 12)];
    if (nearest(x + 3, z + 3).distance < 8 || !free(x + 3, z + 3, 6) || hidesTiles(x + 3, z + 3, storey * 2, 6))
      continue;
    ruin(x, z, side < 0.4 ? 0 : side < 0.7 ? Math.PI / 2 : -Math.PI / 2);
  }

  // Wrecks left along the road, nose more or less the way it runs.
  for (let attempt = 0; attempt < 600 && wrecks.length < 22; attempt++) {
    const x = minX + random() * (maxX - minX);
    const z = minZ + random() * (maxZ - minZ);
    const { distance, dx, dz } = nearest(x, z);
    if (distance < 2.4 || distance > 3.6 || !clearOfStart(x, z, 2)) continue;
    const piece = [...WRECKS][Math.floor(random() * WRECKS.size)];
    const { scale, size } = PIECES[piece];
    const radius = (Math.max(size[0], size[2]) / 2) * scale;
    if (!free(x, z, radius) || hidesTiles(x, z, size[1] * scale, radius)) continue;
    put(wrecks, piece, x, z, Math.atan2(dx, dz) + (random() - 0.5) * 0.8);
  }

  const total = SCATTER.reduce((sum, [, weight]) => sum + weight, 0);
  const area = (maxX - minX) * (maxZ - minZ);
  for (let attempt = Math.round(area * 1.2); attempt > 0; attempt--) {
    const x = minX + 1 + random() * (maxX - minX - 2);
    const z = minZ + 1 + random() * (maxZ - minZ - 2);
    let roll = random() * total;
    const [piece] = SCATTER.find(([, weight]) => (roll -= weight) < 0) ?? SCATTER[0];
    const { scale, size } = PIECES[piece];
    const radius = (Math.max(size[0], size[2]) / 2) * scale;
    if (nearest(x, z).distance < 2 + radius || !clearOfStart(x, z, radius)) continue;
    if (!free(x, z, radius) || hidesTiles(x, z, size[1] * scale, radius)) continue;
    put(pieces, piece, x, z, random() * Math.PI * 2);
    if (piece === "fire-basket") fires.push([x, FLOOR + size[1] * scale + 0.25, z]);
  }

  return { bounds, pieces, wrecks, fires };
}
