import type { CardId } from "../cards/catalog";
import type { RealmKind, TileEffect, TileId, TimedBlessing, TrapCurse } from "./types";

export const BLESSING_ENERGY = 2;

/** Tiles in a realm track. */
export const TRACK_LENGTH = 18;

/** Moves are counted in tiles here and become tile ids once the track is laid out. */
type TrackStep =
  | { kind: "curse"; curse: TrapCurse }
  | { kind: "skipTurn" }
  | { kind: "setback"; tiles: number; curse?: TrapCurse }
  | { kind: "blessing"; blessing: TimedBlessing }
  /** See DIVINE_CARDS. */
  | { kind: "card"; cardId: CardId };

const drain: TrackStep = { kind: "curse", curse: "drain" };
const discard: TrackStep = { kind: "curse", curse: "discard" };
const skip: TrackStep = { kind: "skipTurn" };
const blessing = (kind: TimedBlessing): TrackStep => ({ kind: "blessing", blessing: kind });
const relic = (cardId: CardId): TrackStep => ({ kind: "card", cardId });

/** Hell only takes; heaven only gives what can't be had elsewhere, with no tile carrying past the others. */
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

/** The pattern is rotated by the portal's tile; a setback on the first tile becomes a plain curse. */
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
