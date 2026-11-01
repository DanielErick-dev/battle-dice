import { describe, expect, it } from "vitest";
import { CLASSIC_BOARD } from "@/game/domain/board/presets";
import { createGame } from "@/game/domain/core/engine";
import { battleLogLine } from "./battleLogText";

const { players } = createGame(CLASSIC_BOARD, [
  { id: "p1", name: "Bruxa Carmesim" },
  { id: "p2", name: "Bjorn" },
  { id: "p3", name: "Zarek" },
]);

describe("battle log lines", () => {
  it("names players by seat and character", () => {
    expect(battleLogLine({ type: "abilityUsed", playerId: "p1", ability: "levitation" }, players)).toEqual({
      actor: "p1",
      text: "J1 (Bruxa Carmesim) usou Levitação Carmesim",
    });
  });

  it("tells who trampled whom and how far back", () => {
    const line = battleLogLine(
      { type: "playerTrampled", playerId: "p3", by: "p2", tile: 10, path: [9, 8, 7, 6, 5, 4], seated: false },
      players,
    );
    expect(line).toEqual({ actor: "p2", text: "J2 (Bjorn) atropelou J3 (Zarek) e o mandou 6 casas para trás" });
  });

  it("spells out a roll's dice and bonus", () => {
    const line = battleLogLine({ type: "diceRolled", playerId: "p2", value: 11, dice: [4, 5], bonus: 2 }, players);
    expect(line?.text).toBe("J2 (Bjorn) rolou 11 (4 + 5 + 2)");
  });

  it("marks each new turn as a divider", () => {
    expect(battleLogLine({ type: "turnChanged", playerId: "p3" }, players)).toMatchObject({ divider: true });
  });

  it("leaves out walks and draws", () => {
    expect(battleLogLine({ type: "playerMoved", playerId: "p1", path: [2, 3] }, players)).toBeNull();
  });
});
