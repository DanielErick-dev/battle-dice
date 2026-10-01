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

  it("plays a Dormant Fury move as a lightning dash: launch and strike, a blur of tiles, then arrival", () => {
    const steps = eventToSteps({ type: "playerMoved", playerId: "p1", path: [2, 3, 4], dash: true }, DEFAULT_TIMINGS);
    expect(steps.map((step) => step.durationMs)).toEqual([
      DEFAULT_TIMINGS.dashLaunchMs + DEFAULT_TIMINGS.dashStrikeMs,
      DEFAULT_TIMINGS.dashStepMs,
      DEFAULT_TIMINGS.dashStepMs,
      DEFAULT_TIMINGS.dashStepMs,
      DEFAULT_TIMINGS.dashArriveMs,
    ]);
    const views = replay(initial(), { type: "playerMoved", playerId: "p1", path: [2, 3, 4], dash: true });
    expect(views[0].dash).toMatchObject({ playerId: "p1", path: [1, 2, 3, 4], arrived: false });
    expect(views.at(-1)?.dash?.arrived).toBe(true);
    expect(views.at(-1)?.players[0].position).toBe(4);
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

  it("flies an Arrow Rain volley at its targets, then leaves arrows in the tiles it pins until freed", () => {
    const [flying, landed] = replay(initial(), {
      type: "arrowsLoosed",
      playerId: "p1",
      targets: [5, 9],
      pinned: [5, 9],
      hidden: [9],
    });
    expect(flying.volley).toMatchObject({ id: 1, playerId: "p1", from: 1, targets: [5, 9] });
    expect(flying.pinnedTraps).toEqual([]);
    expect(landed.pinnedTraps).toEqual([5, 9]);
    const [freed] = replay(landed, { type: "trapUnpinned", tile: 5 });
    expect(freed.pinnedTraps).toEqual([9]);
  });

  it("throws Card Gamble's die, shows the verdict, then moves each stolen card into the taker's hand", () => {
    const [rolling, verdict] = replay(initial(), { type: "gambleRolled", playerId: "p1", value: 5, won: true });
    expect(rolling).toMatchObject({ isRolling: true, roll: { dice: [5] } });
    expect(verdict).toMatchObject({ isRolling: false, effect: { kind: "gamble", gamble: { value: 5, won: true } } });

    const card = { uid: "p2:0", cardId: "windStep" as const };
    const table = {
      ...initial(),
      players: [...initial().players, { ...initial().players[0], id: "p2", hand: [card] }],
    };
    const steps = replay(table, { type: "cardsStolen", playerId: "p1", from: "p2", cards: [card], discarded: [] });
    expect(steps[0].drawing?.card).toEqual(card);
    expect(steps[0].players[1].hand).toEqual([]);
    expect(steps[1].players[0].hand).toContainEqual(card);
  });

  it("lifts each resurrected card off the discard pile, shows it, then puts it in the hand", () => {
    const card = { uid: "p1:3", cardId: "healingHerb" as const };
    const table = { ...initial(), players: [{ ...initial().players[0], discard: [card] }] };
    const steps = replay(table, { type: "cardsResurrected", playerId: "p1", cards: [card] });
    expect(steps[0].drawing?.card).toEqual(card);
    expect(steps[0].players[0].discard).toEqual([]);
    expect(steps[1].players[0].hand).toContainEqual(card);
    expect(steps[1].drawing).toBeNull();
  });

  it("puts written seals on the board as scrolls, and breaks one open with its banner", () => {
    const [written] = replay(initial(), { type: "sealsWritten", playerId: "p1", tiles: [3, 5, 7, 9] });
    expect(written.seals).toEqual(
      [3, 5, 7, 9].map((tile, index) => ({
        tile,
        owner: "p1",
        kind: ["tithe", "ruin", "silence", "bloodPact"][index],
      })),
    );
    const [broken] = replay(written, {
      type: "sealBroken",
      playerId: "p1",
      owner: "p1",
      tile: 5,
      kind: "bloodPact",
      energyLost: 0,
      energyGained: 2,
    });
    expect(broken.seals.map((seal) => seal.tile)).toEqual([3, 7, 9]);
    expect(broken.effect).toMatchObject({ kind: "seal", seal: { kind: "bloodPact", energyGained: 2 } });
    expect(broken.players[0].energy).toBe(written.players[0].energy + 2);
  });

  it("shows apparitions as they're summoned, and drops them when struck or dispelled", () => {
    const [summoned] = replay(initial(), { type: "spectersSummoned", playerId: "p1", tiles: [4, 8] });
    expect(summoned.specters).toEqual([
      { tile: 4, owner: "p1", kind: "plunder" },
      { tile: 8, owner: "p1", kind: "hunger" },
    ]);
    const [struck] = replay(summoned, {
      type: "specterStruck",
      playerId: "p1",
      owner: "p1",
      tile: 8,
      kind: "hunger",
      energyTaken: 0,
      energyGained: 3,
      chargeGained: 0,
    });
    expect(struck.specters).toEqual([{ tile: 4, owner: "p1", kind: "plunder" }]);
    expect(struck.effect).toMatchObject({ kind: "specter", specter: { kind: "hunger", energyGained: 3 } });
    const [dispelled] = replay(struck, { type: "spectersDispelled", playerId: "p1", owner: "p1", tiles: [4] });
    expect(dispelled.specters).toEqual([]);
    expect(dispelled.effect).toMatchObject({ kind: "specter", specter: { kind: null } });
  });

  it("counts cards left in the turn, two once Double Cast is used", () => {
    expect(cardsLeftThisTurn(initial())).toBe(1);
    const doubled: MatchView = { ...initial(), abilityInUse: "doubleCast" };
    expect(cardsLeftThisTurn(doubled)).toBe(2);
    expect(cardsLeftThisTurn({ ...doubled, cardsPlayedThisTurn: 1 })).toBe(1);
  });
});
