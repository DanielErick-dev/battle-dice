import { describe, expect, it } from "vitest";
import { CLASSIC_BOARD } from "@/game/domain/board/presets";
import { createGame } from "@/game/domain/core/engine";
import { lastEvent } from "./lastEvent";

const { players } = createGame(
  CLASSIC_BOARD,
  [
    { id: "p1", name: "Aria" },
    { id: "p2", name: "Bran" },
  ],
  { seed: 1 },
);

describe("lastEvent", () => {
  it("skips the turn divider for the last real line", () => {
    const line = lastEvent(
      [
        { id: 1, event: { type: "diceRolled", playerId: "p1", value: 4, dice: [4] } },
        { id: 2, event: { type: "turnChanged", playerId: "p2" } },
      ],
      players,
    );
    expect(line).toEqual({ id: 1, text: "J1 (Aria) rolou 4" });
  });

  it("is null before anything happened", () => {
    expect(lastEvent([], players)).toBeNull();
  });
});
