import { describe, expect, it } from "vitest";
import { CLASSIC_BOARD } from "@/game/domain/board/presets";
import { createGame } from "@/game/domain/core/engine";
import { createInitialView, type MatchView } from "../../model/matchView";
import { tokenSignals } from "./tokenSignals";

const base = createInitialView(createGame(CLASSIC_BOARD, [{ id: "p1", name: "Tenzai" }], { seed: 1 }));
const onTile = (tile: number, walkEnd: MatchView["walkEnd"]): MatchView => ({
  ...base,
  players: base.players.map((player) => ({ ...player, position: tile })),
  elementals: { ...base.elementals, walls: [{ tile: 5, owner: "p1", hp: 8, maxHp: 8 }] },
  walkEnd,
});
const overWall = (view: MatchView) => tokenSignals(view, view.players[0]!).overWall;

describe("crossing a stone wall", () => {
  it("happens stepping onto the wall's tile mid-walk", () => {
    expect(overWall(onTile(5, { playerId: "p1", tile: 8 }))).toBe(true);
  });

  it("doesn't when the wall rises under someone standing still", () => {
    expect(overWall(onTile(5, null))).toBe(false);
  });

  it("doesn't while someone else walks", () => {
    expect(overWall(onTile(5, { playerId: "p2", tile: 8 }))).toBe(false);
  });
});
