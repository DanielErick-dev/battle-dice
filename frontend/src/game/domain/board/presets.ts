import { generateBoard } from "./generator";
import type { TileEffect, TileId } from "@/game/domain/types";
import type { BoardDefinition } from "./board";

export const CLASSIC_BOARD: BoardDefinition = {
  size: 20,
  effects: {
    5: { kind: "portal", to: 10 },
    8: { kind: "trap", to: 6 },
    15: { kind: "portal", to: 19 },
    18: { kind: "trap", to: 17 },
  },
};

/** The classic board plus card tiles, cursed traps and realm portals: what the "Treino" preset plays on. */
export const TRAINING_BOARD: BoardDefinition = {
  ...CLASSIC_BOARD,
  effects: {
    ...CLASSIC_BOARD.effects,
    ...cards([3, 12]),
    5: { kind: "portal", to: 10, realm: "infernal" },
    8: { kind: "trap", to: 6, curse: "drain" },
    15: { kind: "portal", to: 19, realm: "celestial" },
    18: { kind: "trap", to: 17, curse: "discard" },
    4: { kind: "blessing", blessing: "energy" },
    16: { kind: "blessing", blessing: "energy" },
  },
  trapZones: [{ from: 9, to: 14, traps: 1 }],
};

/** 200 tiles laid out by the generator; the fixed seed keeps it identical for everyone. */
export const POWER_TOURNAMENT_BOARD: BoardDefinition = generateBoard({
  size: 200,
  seed: 2026,
  density: {
    portal: 6,
    trap: 9,
    advance: 8,
    extraTurn: 4,
    skipTurn: 4,
    card: 12,
    energy: 10,
    charge: 5,
  },
  trapZones: { count: 3, length: 10, traps: 2 },
  // The opening has no portal: everyone plays through it, and the Mystic Gate can't skip it.
  portalsFrom: 25,
});

function cards(tiles: readonly TileId[]): Record<TileId, TileEffect> {
  return Object.fromEntries(tiles.map((id) => [id, { kind: "card" } as const]));
}
