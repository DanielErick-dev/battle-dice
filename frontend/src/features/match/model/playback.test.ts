import { describe, expect, it } from "vitest";
import { CLASSIC_BOARD } from "@/game/domain/board";
import { createGame } from "@/game/domain/engine";
import type { GameEvent } from "@/game/domain/events";
import { DEFAULT_TIMINGS } from "../config";
import { cardsLeftThisTurn, createInitialView, type MatchView } from "./matchView";
import { eventToSteps } from "./playback";

const initial = () => createInitialView(createGame(CLASSIC_BOARD, [{ id: "p1", name: "Aria" }]));

/** The view after every step of an event. */
function replay(view: MatchView, event: GameEvent): MatchView[] {
  const views: MatchView[] = [];
  for (const step of eventToSteps(event, DEFAULT_TIMINGS)) views.push((view = step.apply(view)));
  return views;
}

describe("playback of rule events", () => {
  it("shows a hidden trap on its tile, then throws the player back", () => {
    const [reveal, thrown] = replay(initial(), { type: "hiddenTrapSprung", playerId: "p1", tile: 9, to: 4 });
    expect(reveal.effect).toMatchObject({ kind: "hiddenTrap", from: 9, to: 4 });
    expect(thrown.players[0].position).toBe(4);
  });

  it("announces a charged ability", () => {
    const [shown] = replay(initial(), { type: "abilityReady", playerId: "p1", ability: "doubleCast" });
    expect(shown.effect).toMatchObject({ kind: "abilityReady", ability: { id: "doubleCast" } });
    expect(shown.players[0].abilityCharge).toBe(3);
  });

  it("spends a used ability: energy it gave, and in effect for the turn unless it's reactive", () => {
    const [grace] = replay(initial(), {
      type: "abilityUsed",
      playerId: "p1",
      ability: "celestialGrace",
      energyGained: 2,
    });
    expect(grace.effect).toMatchObject({ kind: "abilityUsed", ability: { id: "celestialGrace", energyGained: 2 } });
    expect(grace.players[0]).toMatchObject({ energy: initial().players[0].energy + 2, abilityCharge: 0 });
    expect(grace.abilityInUse).toBe("celestialGrace");

    const [ward] = replay(initial(), { type: "abilityUsed", playerId: "p1", ability: "trapWard", energyGained: 0 });
    expect(ward.abilityInUse).toBeNull();
  });

  it("holds a ward prompt until the player answers", () => {
    const [asking] = replay(initial(), { type: "wardOffered", playerId: "p1", tile: 8, threat: "trap" });
    expect(asking.pendingWard).toEqual({ playerId: "p1", tile: 8, threat: "trap" });
  });

  it("drops the shield when it blocks a trap, but not when the ability does", () => {
    const shielded: MatchView = { ...initial(), players: initial().players.map((p) => ({ ...p, shielded: true })) };
    const [byShield] = replay(shielded, { type: "trapBlocked", playerId: "p1", tile: 8, ward: "shield", hidden: true });
    expect(byShield.players[0].shielded).toBe(false);
    expect(byShield.effect?.ward).toEqual({ kind: "shield", hidden: true });

    const [byAbility] = replay(shielded, {
      type: "trapBlocked",
      playerId: "p1",
      tile: 8,
      ward: "ability",
      hidden: false,
    });
    expect(byAbility.players[0].shielded).toBe(true);
  });

  it("counts cards left in the turn, two once Double Cast is used", () => {
    expect(cardsLeftThisTurn(initial())).toBe(1);
    const doubled: MatchView = { ...initial(), abilityInUse: "doubleCast" };
    expect(cardsLeftThisTurn(doubled)).toBe(2);
    expect(cardsLeftThisTurn({ ...doubled, cardsPlayedThisTurn: 1 })).toBe(1);
  });
});
