import { describe, expect, it } from "vitest";
import { newGame } from "@/game/domain/testing";
import { createInitialView } from "../../model/matchView/create";
import { focusFigureId } from "./cameraFocus";

const view = () => createInitialView(newGame({ size: 30, effects: {} }, { a: "doubleCast", b: "doubleCast" }));

describe("whose figure the camera follows live", () => {
  it("whoever plays, or whoever is moving", () => {
    expect(focusFigureId(view())).toBe("a");
    expect(focusFigureId({ ...view(), movingPlayerId: "b" })).toBe("b");
  });

  it("nobody while someone sits down to lose turns: that spot is watched instead", () => {
    const sitting = { ...view(), effect: { kind: "skipTurn" as const, playerId: "b", from: 4, to: 4 } };
    expect(focusFigureId(sitting)).toBeNull();
  });
});
