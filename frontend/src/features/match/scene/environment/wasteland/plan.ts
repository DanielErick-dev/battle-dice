import { seededRandom } from "@/game/domain/core/random";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import type { KitItem } from "../shared/kits";
import {
  clearOfStart,
  footprint,
  hidesTiles,
  isFree,
  pickWeighted,
  trailBounds,
  trailNearest,
  TRAIL_GROUND,
  type Blocker,
  type Bounds,
} from "../shared/trailPlan";
import { PIECES, SCATTER, WRECKS, type PieceId } from "./catalog";
import { pick } from "@/features/shared/collections/items";

/** Room between the trail and the edge of the ruins. */
const MARGIN = { side: 9, back: 8, front: 5 };
const FLOOR = TRAIL_GROUND;
/** A ruin's storey: the height (and width) of one wall piece. */
const STOREY = 3.5;

export interface WastelandPlan {
  bounds: Bounds;
  pieces: KitItem[];
  /** The rusted wrecks, drawn darker apart from the rest. */
  wrecks: KitItem[];
  fires: Vec3[];
}

/** Nothing hides a tile from the camera; seeded, so the same every time. */
export function planWasteland(trail: readonly Vec3[]): WastelandPlan {
  const random = seededRandom(67);
  const bounds = trailBounds(trail, MARGIN);
  const { minX, maxX, minZ, maxZ } = bounds;
  const pieces: KitItem[] = [];
  const wrecks: KitItem[] = [];
  const fires: Vec3[] = [];
  const taken: Blocker[] = [];
  const put = (list: KitItem[], piece: PieceId, x: number, z: number, turn: number) => {
    const { scale, size } = PIECES[piece];
    list.push({ piece, x, y: FLOOR, z, turn, scale });
    taken.push({ x, z, radius: footprint(size, scale) });
  };

  // Ruined blocks round the edge: broken walls, a storey or two of windows, some scaffolding.
  const ruin = (x: number, z: number, turn: number) => {
    const [cos, sin] = [Math.cos(turn), Math.sin(turn)];
    const at = (along: number, across: number): [number, number] => [
      x + cos * along + sin * across,
      z - sin * along + cos * across,
    ];
    const floors = 1 + Math.floor(random() * 2);
    for (let level = 0; level < floors; level++) {
      for (let step = 0; step < 3; step++) {
        const [wx, wz] = at(step * STOREY, 0);
        const piece =
          level === floors - 1 && random() < 0.5
            ? "wall-broken-type-a"
            : random() < 0.5
              ? "wall-a-flat-window"
              : "wall-b-flat-window";
        pieces.push({ piece, x: wx, y: FLOOR + level * STOREY, z: wz, turn, scale: STOREY });
        const [sx, sz] = at(0, step * STOREY);
        pieces.push({
          piece: random() < 0.3 ? "wall-broken-type-b" : "wall-a-flat-window",
          x: sx,
          y: FLOOR + level * STOREY,
          z: sz,
          turn: turn + Math.PI / 2,
          scale: STOREY,
        });
      }
    }
    if (random() < 0.5) {
      const [px, pz] = at(STOREY * 2, STOREY);
      pieces.push({ piece: "scaffolding-structure", x: px, y: FLOOR, z: pz, turn, scale: STOREY });
    }
    taken.push({ x: x + (cos + sin) * STOREY, z: z + (cos - sin) * STOREY, radius: STOREY * 2.2 });
  };
  for (let attempt = 0; attempt < 300; attempt++) {
    const side = random();
    const [x, z] =
      side < 0.4
        ? [minX + 2 + random() * (maxX - minX - 10), minZ + 1 + random() * 3]
        : side < 0.7
          ? [minX + 1 + random() * 3, minZ + 4 + random() * (maxZ - minZ - 12)]
          : [maxX - 9 - random() * 3, minZ + 4 + random() * (maxZ - minZ - 12)];
    const [cx, cz] = [x + 3, z + 3];
    if (trailNearest(trail, cx, cz).distance < 8 || !isFree(taken, cx, cz, 6, 0.3)) continue;
    if (hidesTiles(trail, cx, cz, STOREY * 2, 6)) continue;
    ruin(x, z, side < 0.4 ? 0 : side < 0.7 ? Math.PI / 2 : -Math.PI / 2);
  }

  // Wrecks left along the road, nose more or less the way it runs.
  for (let attempt = 0; attempt < 600 && wrecks.length < 22; attempt++) {
    const x = minX + random() * (maxX - minX);
    const z = minZ + random() * (maxZ - minZ);
    const { distance, dx, dz } = trailNearest(trail, x, z);
    if (distance < 2.4 || distance > 3.6 || !clearOfStart(trail, x, z, 2)) continue;
    const piece = pick(WRECKS, random());
    const { scale, size } = PIECES[piece];
    const radius = footprint(size, scale);
    if (!isFree(taken, x, z, radius, 0.3) || hidesTiles(trail, x, z, size[1] * scale, radius)) continue;
    put(wrecks, piece, x, z, Math.atan2(dx, dz) + (random() - 0.5) * 0.8);
  }

  const area = (maxX - minX) * (maxZ - minZ);
  for (let attempt = Math.round(area * 1.2); attempt > 0; attempt--) {
    const x = minX + 1 + random() * (maxX - minX - 2);
    const z = minZ + 1 + random() * (maxZ - minZ - 2);
    const [piece] = pickWeighted(SCATTER, random) ?? SCATTER[0];
    const { scale, size } = PIECES[piece];
    const radius = footprint(size, scale);
    if (trailNearest(trail, x, z).distance < 2 + radius || !clearOfStart(trail, x, z, radius)) continue;
    if (!isFree(taken, x, z, radius, 0.3) || hidesTiles(trail, x, z, size[1] * scale, radius)) continue;
    put(pieces, piece, x, z, random() * Math.PI * 2);
    if (piece === "fire-basket") fires.push([x, FLOOR + size[1] * scale + 0.25, z]);
  }

  return { bounds, pieces, wrecks, fires };
}
