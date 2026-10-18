import type { BoardDefinition } from "../board";

/** A draining trap at 12 (back to 8) and a discard curse at 20; everything else plain. */
export const TRAP_AND_CURSE_BOARD: BoardDefinition = {
  size: 40,
  effects: {
    12: { kind: "trap", to: 8, curse: "drain" },
    20: { kind: "curse", curse: "discard" },
  },
};

/** A card tile at 4, a portal from 10 to 20 and a trap at 12 (back to 8) on a 30-tile path. */
export const CARD_PORTAL_TRAP_BOARD: BoardDefinition = {
  size: 30,
  effects: {
    4: { kind: "card" },
    10: { kind: "portal", to: 20 },
    12: { kind: "trap", to: 8 },
  },
};

/** Harm at 12 (a trap), 15 (a curse) and 20 (a trap), an extra turn at 30; everything else plain. */
export const HARM_AHEAD_BOARD: BoardDefinition = {
  size: 60,
  effects: {
    12: { kind: "trap", to: 8 },
    15: { kind: "curse", curse: "drain" },
    20: { kind: "trap", to: 16 },
    30: { kind: "extraTurn" },
  },
};
