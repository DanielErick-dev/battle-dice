import type { Vec3 } from "../boardLayout";

/** Water surface height (see ArenaEnvironment). */
export const WATER_LEVEL = -1.05;
/** Ground along the trail: the road's slabs (see TileMesh) sit sunk in it, a little proud of the earth. */
export const TRAIL_GROUND = 0.06;
/** Where the trodden earth gives way to grass, from the trail's centre line. */
export const TRAIL_EARTH = 1.6;
/** Room past the trail's sides and front, and (wider) at the back for the mountains. */
const MARGIN = { side: 8, front: 6, back: 11 };

/** The island round a trail: its extent, and the trail's segments to measure distances from. */
export interface IslandShape {
  centerZ: number;
  halfWidth: number;
  halfDepth: number;
  /** Where the trail's far end lies; the mountains rise behind it. */
  backZ: number;
  segments: readonly [number, number, number, number][];
  /** A stream running from the mountains to the front shore, across every row of the trail. */
  river: { x: number; bend: number };
}

/** Half the stream's width, and how far below the sea's surface its bed lies. */
export const RIVER_HALF_WIDTH = 1.5;
const RIVER_BED = 0.5;

/** The stream's centre line at depth `z`. */
export function riverX(shape: IslandShape, z: number): number {
  return shape.river.x + Math.sin(z * 0.11 + 1.3) * shape.river.bend;
}

/** How far a point is from the stream's middle, across it. */
export function riverDistance(shape: IslandShape, x: number, z: number): number {
  return Math.abs(x - riverX(shape, z));
}

export function islandShape(trail: readonly Vec3[]): IslandShape {
  const xs = trail.map(([x]) => x);
  const zs = trail.map(([, , z]) => z);
  const [minX, maxX, minZ, maxZ] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const back = minZ - MARGIN.back;
  const front = maxZ + MARGIN.front;
  return {
    centerZ: (back + front) / 2,
    halfWidth: (maxX - minX) / 2 + MARGIN.side,
    halfDepth: (front - back) / 2,
    backZ: minZ,
    segments: trail.slice(1).map(([x, , z], index) => [trail[index][0], trail[index][2], x, z]),
    river: { x: (maxX - minX) * 0.2, bend: Math.min(3, (maxX - minX) * 0.08) },
  };
}

/** Distance from the trail's centre line. */
export function trailDistance(shape: IslandShape, x: number, z: number): number {
  return trailNearest(shape, x, z).distance;
}

/** Distance from the trail's centre line, and how far along the trail its nearest point is (0 start, 1 finish). */
export function trailNearest(shape: IslandShape, x: number, z: number): { distance: number; along: number } {
  let distance = Infinity;
  let along = 0;
  shape.segments.forEach(([ax, az, bx, bz], index) => {
    const [dx, dz] = [bx - ax, bz - az];
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < distance) [distance, along] = [d, (index + t) / Math.max(1, shape.segments.length)];
  });
  return { distance, along };
}

/** Where the castle grounds begin along the trail (see settlements.ts REGIONS), and the village ends. */
export const CASTLE_FROM = 0.7;
export const VILLAGE_UNTIL = 0.36;

/** 0 out at sea, 1 well inland: a rounded rectangle with a ragged shore. */
export function landMask(shape: IslandShape, x: number, z: number): number {
  const u = Math.abs(x / shape.halfWidth);
  const v = Math.abs((z - shape.centerZ) / shape.halfDepth);
  const reach = (u ** 4 + v ** 4) ** 0.25 + (noise(x * 0.18, z * 0.18) - 0.5) * 0.12;
  return 1 - smoothstep(0.82, 1.02, reach);
}

/** The ground's height and what it's covered in at a point. */
export function groundAt(shape: IslandShape, x: number, z: number): { height: number; cover: Cover } {
  const land = landMask(shape, x, z);
  const { distance, along } = trailNearest(shape, x, z);
  // Rolling hills away from the trail; it runs on flat ground.
  const away = smoothstep(TRAIL_EARTH, TRAIL_EARTH + 3.5, distance);
  const hills = (fbm(x * 0.09, z * 0.09) - 0.35) * 2.2 * away;
  // Mountains along the far shore, behind where the trail begins.
  const behind = smoothstep(shape.backZ - 2, shape.backZ - 8, z);
  const peaks = behind * (2.5 + fbm(x * 0.16 + 9, z * 0.16) * 7) * away;
  const ground = TRAIL_GROUND + Math.max(-0.05, hills) + peaks;
  // The stream cuts through everything, the trail too: it crosses on bridges.
  const banks = smoothstep(RIVER_HALF_WIDTH * 0.6, RIVER_HALF_WIDTH + 0.9, riverDistance(shape, x, z));
  const inland = WATER_LEVEL - RIVER_BED + (ground - WATER_LEVEL + RIVER_BED) * banks;
  const height = WATER_LEVEL - 0.9 + (inland - WATER_LEVEL + 0.9) * smoothstep(0, 0.7, land);
  const cover: Cover =
    height > 4.2
      ? "snow"
      : peaks > 1.4
        ? "rock"
        : height < WATER_LEVEL + 0.45
          ? "sand"
          : banks < 0.98
            ? "bank"
            : distance < TRAIL_EARTH * (0.85 + noise(x * 0.7, z * 0.7) * 0.3)
              ? "earth"
              : // The castle grounds are paved either side of the road.
                along > CASTLE_FROM && distance < TRAIL_EARTH + 1.3 + noise(x * 0.5, z * 0.5)
                ? "paving"
                : // Meadows thicken round the village.
                  noise(x * 0.12 + 40, z * 0.12) > (along < VILLAGE_UNTIL ? 0.38 : 0.55)
                  ? "meadow"
                  : "grass";
  return { height, cover };
}

export type Cover = "earth" | "grass" | "meadow" | "paving" | "sand" | "bank" | "rock" | "snow";

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function hash(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth value noise in [0, 1]. */
export function noise(x: number, z: number): number {
  const [ix, iz] = [Math.floor(x), Math.floor(z)];
  const [fx, fz] = [x - ix, z - iz];
  const [ux, uz] = [fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)];
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm(x: number, z: number): number {
  return noise(x, z) * 0.55 + noise(x * 2.1, z * 2.1) * 0.3 + noise(x * 4.3, z * 4.3) * 0.15;
}
