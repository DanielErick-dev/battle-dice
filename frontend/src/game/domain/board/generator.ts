import type { BoardDefinition, TrapZoneDefinition } from "./board";
import { seededRandom, shuffle } from "../core/random";
import type { RealmKind, TileEffect, TileId, TrapCurse } from "./types";

/** "energy" and "charge" become blessing tiles. */
export type GeneratedEffect = "portal" | "trap" | "advance" | "extraTurn" | "skipTurn" | "card" | "energy" | "charge";

export interface BoardRecipe {
  size: number;
  /** Same seed, same board for every player and a future server. */
  seed: number;
  /** Per 100 tiles. */
  density: Readonly<Partial<Record<GeneratedEffect, number>>>;
  trapZones?: { count: number; length: number; traps: number };
  /** Everyone has to play through the opening. */
  portalsFrom?: number;
  /** Extra card tiles spread over the stretch from `from` (a fraction of the board) to the end, when hands run dry. */
  lateCards?: { count: number; from: number };
}

/** [min, max] tiles; traps go back, the others forward. */
const REACH: Readonly<Record<"portal" | "trap" | "advance", readonly [number, number]>> = {
  portal: [8, 20],
  trap: [5, 18],
  advance: [2, 5],
};

/** One effect per stretch, in shuffled order; every jump lands on a tile kept plain, so nothing chains. */
export function generateBoard({
  size,
  seed,
  density,
  trapZones: zoneRecipe,
  portalsFrom = 2,
  lateCards,
}: BoardRecipe): BoardDefinition {
  const random = seededRandom(seed);
  const effects: Record<TileId, TileEffect> = {};
  const trapZones = zoneRecipe ? spreadTrapZones(size, zoneRecipe) : [];
  // Start, finish, jump destinations and trap zones must stay plain.
  const reserved = new Set<TileId>([1, size, ...trapZones.flatMap(({ from, to }) => range(from, to))]);
  const isFree = (tile: TileId) => tile > 1 && tile < size && !reserved.has(tile) && !(tile in effects);

  const shuffled = shuffle(
    (Object.entries(density) as [GeneratedEffect, number][]).flatMap(([kind, perHundred]) =>
      Array<GeneratedEffect>(Math.round((perHundred * size) / 100)).fill(kind),
    ),
    random,
  );
  const stretch = (size - 2) / shuffled.length;
  const kinds = portalsLater(shuffled, Math.ceil((portalsFrom - 2) / stretch));

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
      } else if (kind === "energy" || kind === "charge") {
        effects[tile] = { kind: "blessing", blessing: kind };
      } else {
        effects[tile] = { kind };
      }
      return;
    }
  });

  if (lateCards) {
    // Its own stream, so adding late cards leaves everything laid out above where it was.
    const lateRandom = seededRandom(seed ^ 0xca4d);
    const start = Math.round(size * lateCards.from);
    const span = (size - 1 - start) / lateCards.count;
    for (let index = 0; index < lateCards.count; index++) {
      const first = start + Math.floor(index * span);
      const tiles = shuffle(range(first, Math.min(size - 1, start + Math.floor((index + 1) * span) - 1)), lateRandom);
      const tile = tiles.find(isFree);
      if (tile !== undefined) effects[tile] = { kind: "card" };
    }
  }

  return { size, effects: openRealms(curseTraps(effects, seed)), trapZones };
}

/** Each portal among the first `opening` stretches swaps with the next non-portal after them. */
function portalsLater(kinds: readonly GeneratedEffect[], opening: number): GeneratedEffect[] {
  const result = [...kinds];
  let swap = opening;
  for (let index = 0; index < Math.min(opening, result.length); index++) {
    if (result[index] !== "portal") continue;
    while (swap < result.length && result[swap] === "portal") swap++;
    if (swap >= result.length) break;
    [result[index], result[swap]] = [result[swap], result[index]];
    swap++;
  }
  return result;
}

/** Centred at even intervals (for 3: a quarter, half and three quarters). */
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
      portals.map((tile, index) => [tile, { ...effects[tile], realm: realms[index % realms.length] } as TileEffect]),
    ),
  };
}

/** A third take a card, a third drain, a third none; its own random stream keeps the layout stable. */
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
