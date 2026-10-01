import type { RealmKind, TileEffect, TileId, TrapCurse } from "./types";

/** Energy a celestial blessing gives. */
export const BLESSING_ENERGY = 2;

/** Tiles in a realm track. */
export const TRACK_LENGTH = 18;

/**
 * One tile of a track pattern. Moves along the track are counted in tiles here and become
 * the track's own tile ids once it's laid out.
 */
type TrackStep =
  | { kind: "curse"; curse: TrapCurse }
  | { kind: "skipTurn" }
  /** Thrown back `tiles` along the track, and cursed too with a `curse`. */
  | { kind: "setback"; tiles: number; curse?: TrapCurse }
  | { kind: "blessing"; blessing: "energy" | "shield" }
  | { kind: "card" }
  | { kind: "extraTurn" }
  /** Carried `tiles` further along the track. */
  | { kind: "rush"; tiles: number };

const drain: TrackStep = { kind: "curse", curse: "drain" };
const discard: TrackStep = { kind: "curse", curse: "discard" };
const skip: TrackStep = { kind: "skipTurn" };
const energy: TrackStep = { kind: "blessing", blessing: "energy" };
const shield: TrackStep = { kind: "blessing", blessing: "shield" };
const card: TrackStep = { kind: "card" };
const extraTurn: TrackStep = { kind: "extraTurn" };

/**
 * What each realm track holds, TRACK_LENGTH tiles each. The infernal track only takes: every
 * tile curses, throws back or costs a turn. The celestial one only gives.
 */
const TRACK_PATTERNS: Readonly<Record<RealmKind, readonly TrackStep[]>> = {
  infernal: [
    drain,
    discard,
    { kind: "setback", tiles: 3 },
    skip,
    drain,
    { kind: "setback", tiles: 2, curse: "discard" },
    discard,
    drain,
    { kind: "setback", tiles: 4 },
    skip,
    discard,
    { kind: "setback", tiles: 2, curse: "drain" },
  ],
  celestial: [
    energy,
    card,
    shield,
    { kind: "rush", tiles: 2 },
    energy,
    extraTurn,
    card,
    energy,
    { kind: "rush", tiles: 3 },
    shield,
    card,
    extraTurn,
  ],
};

/**
 * The effects of a track's tiles (`tiles` are its ids, in walking order). Each portal rotates
 * the pattern by its tile number so tracks from different portals differ. A move that would
 * leave the track stops at its end, and one that can't move at all (a setback on the first
 * tile, a rush on the last) becomes the realm's plain curse or blessing instead.
 */
export function trackEffects(realm: RealmKind, portal: TileId, tiles: readonly TileId[]): TileEffect[] {
  const pattern = TRACK_PATTERNS[realm];
  return tiles.map((_, index) => {
    const step = pattern[(index + portal) % pattern.length];
    switch (step.kind) {
      case "setback":
        if (index === 0) return { kind: "curse", curse: step.curse ?? "drain" };
        return {
          kind: "trap",
          to: tiles[Math.max(0, index - step.tiles)],
          ...(step.curse && { curse: step.curse }),
        };
      case "rush":
        if (index === tiles.length - 1) return { kind: "blessing", blessing: "energy" };
        return {
          kind: "advance",
          to: tiles[Math.min(tiles.length - 1, index + step.tiles)],
        };
      default:
        return step;
    }
  });
}
