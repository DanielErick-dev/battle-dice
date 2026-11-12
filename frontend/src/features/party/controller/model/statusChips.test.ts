import { describe, expect, it } from "vitest";
import { CLASSIC_BOARD } from "@/game/domain/board/presets";
import { createGame } from "@/game/domain/core/engine";
import { statusChips } from "./statusChips";

const [player] = createGame(CLASSIC_BOARD, [{ id: "p1", name: "Aria" }], { seed: 1 }).players;
if (!player) throw new Error("one player");

describe("statusChips", () => {
  it("is empty for a fresh player", () => {
    expect(statusChips(player)).toEqual([]);
  });

  it("lists the good before the bad, with turns left", () => {
    const chips = statusChips({ ...player, skipTurns: 2, shielded: true, burning: 1 });
    expect(chips).toEqual([
      { label: "Escudo Arcano", tone: "good" },
      { label: "Perde a vez ×2", tone: "bad" },
      { label: "Pegando fogo · 1 turno", tone: "bad" },
    ]);
  });
});
