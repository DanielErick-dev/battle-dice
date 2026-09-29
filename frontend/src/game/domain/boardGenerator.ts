import type { BoardDefinition, TrapZoneDefinition } from "./board";
import { seededRandom } from "./random";
import type { RealmKind, TileEffect, TileId, TrapCurse } from "./types";

export type GeneratedEffect = "portal" | "trap" | "advance" | "extraTurn" | "skipTurn" | "card";

export interface BoardRecipe {
  size: number;
  /** Same seed, same board: every player (and a future server) gets identical tiles. */
  seed: number;
  /** How many of each effect per 100 tiles. */
  density: Readonly<Record<GeneratedEffect, number>>;
  /** Stretches of plain tiles hiding traps, spread evenly along the path. */
  trapZones?: { count: number; length: number; traps: number };
}

/** How far each jump reaches, in tiles: [min, max]. Traps go back, the others forward. */
const REACH: Readonly<Record<"portal" | "trap" | "advance", readonly [number, number]>> = {
  portal: [8, 20],
  trap: [5, 18],
  advance: [2, 5],
};

/**
 * Lays out a board from a recipe. Effects are spread evenly (one per stretch of the path, in
 * shuffled order) and follow the hand-made boards' rules: start and finish stay plain, and
 * every jump lands on a plain tile that never becomes an effect itself, so nothing chains.
 */
export function generateBoard({ size, seed, density, trapZones: zoneRecipe }: BoardRecipe): BoardDefinition {
  const random = seededRandom(seed);
  const effects: Record<TileId, TileEffect> = {};
  const trapZones = zoneRecipe ? spreadTrapZones(size, zoneRecipe) : [];
  /** Start, finish, jump destinations and trap zones: must stay plain. */
  const reserved = new Set<TileId>([1, size, ...trapZones.flatMap(({ from, to }) => range(from, to))]);
  const isFree = (tile: TileId) => tile > 1 && tile < size && !reserved.has(tile) && !(tile in effects);

  const kinds = shuffle(
    (Object.entries(density) as [GeneratedEffect, number][]).flatMap(([kind, perHundred]) =>
      Array<GeneratedEffect>(Math.round((perHundred * size) / 100)).fill(kind),
    ),
    random,
  );
  const stretch = (size - 2) / kinds.length;

  kinds.forEach((kind, index) => {
    const first = 2 + Math.floor(index * stretch);
    const last = Math.min(size - 1, 2 + Math.floor((index + 1) * stretch) - 1);
    const tiles = shuffle(range(first, last), random);

    for (const tile of tiles) {
      if (!isFree(tile)) continue;
      if (kind === "portal" || kind === "trap" || kind === "advance") {
        const [min, max] = REACH[kind];
        const direction = kind === "trap" ? -1 : 1;
        const destination = shuffle(range(min, max), random)
          .map((distance) => tile + direction * distance)
          .find((candidate) => candidate !== tile && isFree(candidate));
        if (destination === undefined) continue;
        reserved.add(destination);
        effects[tile] = { kind, to: destination };
      } else {
        effects[tile] = { kind };
      }
      return;
    }
  });

  return { size, effects: openRealms(curseTraps(effects, seed)), trapZones };
}

/** Zones centred at even intervals along the path (for 3: at a quarter, half and three quarters). */
function spreadTrapZones(
  size: number,
  { count, length, traps }: NonNullable<BoardRecipe["trapZones"]>,
): TrapZoneDefinition[] {
  return Array.from({ length: count }, (_, index) => {
    const from = Math.round(((index + 1) * size) / (count + 1) - length / 2);
    return { from, to: from + length - 1, traps };
  });
}

/** Every portal opens a realm track, alternating infernal and celestial along the path. */
function openRealms(effects: Record<TileId, TileEffect>): Record<TileId, TileEffect> {
  const portals = Object.keys(effects)
    .map(Number)
    .filter((tile) => effects[tile].kind === "portal")
    .sort((a, b) => a - b);
  const realms: readonly RealmKind[] = ["infernal", "celestial"];
  return {
    ...effects,
    ...Object.fromEntries(
      portals.map((tile, index) => [
        tile,
        {
          ...effects[tile],
          realm: realms[index % realms.length],
        } as TileEffect,
      ]),
    ),
  };
}

/**
 * Gives traps their curses: a third take a card, a third drain energy, a third only send the
 * player back. Uses its own random stream so the tile layout doesn't change with it.
 */
function curseTraps(effects: Record<TileId, TileEffect>, seed: number): Record<TileId, TileEffect> {
  const random = seededRandom(seed ^ 0x5eed);
  const curses: readonly (TrapCurse | null)[] = ["discard", "drain", null];
  return Object.fromEntries(
    Object.entries(effects).map(([tile, effect]) => {
      if (effect.kind !== "trap") return [tile, effect];
      const curse = curses[Math.floor(random() * curses.length)];
      return [tile, curse ? { ...effect, curse } : effect];
    }),
  );
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
