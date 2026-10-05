import type { CardId } from "./cards";
import type { RealmKind, TileEffect, TileId, TimedBlessing, TrapCurse } from "./types";

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
  | { kind: "blessing"; blessing: TimedBlessing }
  /** One of heaven's relics lying on the tile (see DIVINE_CARDS). */
  | { kind: "card"; cardId: CardId };

const drain: TrackStep = { kind: "curse", curse: "drain" };
const discard: TrackStep = { kind: "curse", curse: "discard" };
const skip: TrackStep = { kind: "skipTurn" };
const blessing = (kind: TimedBlessing): TrackStep => ({ kind: "blessing", blessing: kind });
const relic = (cardId: CardId): TrackStep => ({ kind: "card", cardId });

/**
 * What each realm track holds, TRACK_LENGTH tiles each. The infernal track only takes: every
 * tile curses, throws back or costs a turn. The celestial one only gives, and only what can't be
 * had anywhere else: its timed blessings and its divine cards, every tile worth stopping on (no
 * tile carries the player past the others).
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
    blessing("wings"),
    relic("celestialLight"),
    blessing("halo"),
    relic("heavenlyAegis"),
    blessing("inspiration"),
    relic("ascension"),
    blessing("spring"),
  ],
};

/**
 * The effects of a track's tiles (`tiles` are its ids, in walking order). Each portal rotates
 * the pattern by its tile number so tracks from different portals differ. A setback that would
 * leave the track stops at its start, and one on the first tile becomes a plain curse instead.
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
      default:
        return step;
    }
  });
}
