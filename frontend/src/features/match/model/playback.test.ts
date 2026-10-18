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

  it("spends a used ability, in effect for the turn unless it's reactive", () => {
    const [wind] = replay(initial(), { type: "abilityUsed", playerId: "p1", ability: "tailwind" });
    expect(wind.effect).toMatchObject({ kind: "abilityUsed", ability: { id: "tailwind" } });
    expect(wind.players[0]).toMatchObject({ abilityCharge: 0 });
    expect(wind.abilityInUse).toBe("tailwind");

    const [ward] = replay(initial(), { type: "abilityUsed", playerId: "p1", ability: "trapWard" });
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
    expect(views[0].fx.dash).toMatchObject({ playerId: "p1", path: [1, 2, 3, 4], arrived: false });
    expect(views.at(-1)?.fx.dash?.arrived).toBe(true);
    expect(views.at(-1)?.players[0].position).toBe(4);
  });

  it("acts a trample out: the Berserker shoves, the victim flies back, then he runs on from there", () => {
    const [shoving, flying, over] = replay(initial(), {
      type: "playerTrampled",
      playerId: "p1",
      by: "wolf",
      tile: 9,
      path: [8, 7, 6],
      seated: false,
    });
    expect(shoving.fx.trample).toMatchObject({
      by: "wolf",
      victim: "p1",
      tile: 9,
      phase: "shove",
    });
    expect(shoving.players[0].position).toBe(1);
    expect(flying.fx.trample?.phase).toBe("flying");
    expect(flying.players[0].position).toBe(6);
    expect(flying.effect).toMatchObject({ kind: "trampled", count: 3 });
    expect(over.fx.trample?.phase).toBe("over");
    const [runOn] = replay(
      { ...over, players: over.players.map((p) => ({ ...p, id: "wolf" })) },
      {
        type: "playerMoved",
        playerId: "wolf",
        path: [10],
      },
    );
    expect(runOn.fx.trample).toBeNull();
  });

  it("gets a trampled player up off their chair before the shove", () => {
    const event = { type: "playerTrampled", playerId: "p1", by: "wolf", tile: 9, path: [8], seated: true } as const;
    const steps = eventToSteps(event, DEFAULT_TIMINGS);
    expect(steps[0].durationMs).toBe(DEFAULT_TIMINGS.trampleRiseMs);
    const [rising, shoving] = replay(initial(), event);
    expect(rising.fx.trample?.phase).toBe("rise");
    expect(shoving.fx.trample).toMatchObject({ id: rising.fx.trample?.id, phase: "shove" });
  });

  it("shows what Untamed shrugs off as blocked, not as armour", () => {
    const untamed: MatchView = {
      ...initial(),
      players: initial().players.map((p) => ({ ...p, untamed: 2 })),
    };
    const [held] = replay(untamed, {
      type: "armourHeld",
      playerId: "p1",
      tile: 8,
    });
    expect(held.effect).toMatchObject({
      kind: "trapBlocked",
      ward: { kind: "untamed" },
    });
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
    expect(flying.fx.volley).toMatchObject({ id: 1, playerId: "p1", from: 1, targets: [5, 9] });
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
    expect(steps[0].fx.drawing?.card).toEqual(card);
    expect(steps[0].players[1].hand).toEqual([]);
    expect(steps[1].players[0].hand).toContainEqual(card);
  });

  it("lifts each resurrected card off the discard pile, shows it, then puts it in the hand", () => {
    const card = { uid: "p1:3", cardId: "healingHerb" as const };
    const table = { ...initial(), players: [{ ...initial().players[0], discard: [card] }] };
    const steps = replay(table, { type: "cardsResurrected", playerId: "p1", cards: [card] });
    expect(steps[0].fx.drawing?.card).toEqual(card);
    expect(steps[0].players[0].discard).toEqual([]);
    expect(steps[1].players[0].hand).toContainEqual(card);
    expect(steps[1].fx.drawing).toBeNull();
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

  it("counts a lost turn as soon as the player lands on it, so they sit down while still in view", () => {
    const [shown] = replay(initial(), { type: "skipTurnGained", playerId: "p1", tile: 9 });
    expect(shown.effect).toMatchObject({ kind: "skipTurn", from: 9 });
    expect(shown.players[0].skipTurns).toBe(1);
  });

  it("streams the fairy's snow to each tile she enchants in turn, each blooming as its snow lands", () => {
    const steps = eventToSteps({ type: "tilesEnchanted", playerId: "p1", tiles: [9, 14] }, DEFAULT_TIMINGS);
    expect(steps.map((step) => step.durationMs)).toEqual([
      DEFAULT_TIMINGS.frostStreamMs,
      DEFAULT_TIMINGS.frostStreamMs,
      DEFAULT_TIMINGS.noticeMs,
    ]);
    const [first, second, over] = replay(initial(), { type: "tilesEnchanted", playerId: "p1", tiles: [9, 14] });
    expect(first.fx.frostStream).toMatchObject({ tile: 9 });
    expect(first.enchantedTiles).toEqual([]);
    expect(second.fx.frostStream).toMatchObject({ tile: 14 });
    expect(second.enchantedTiles.map(({ tile }) => tile)).toEqual([9]);
    expect(over.fx.frostStream).toBeNull();
    expect(over.enchantedTiles.map(({ tile }) => tile)).toEqual([9, 14]);
  });

  it("holds on the fairy hopping on her own snow, longer than on someone stuck in it", () => {
    const stirred = (playerId: string) =>
      eventToSteps(
        {
          type: "enchantmentStirred",
          playerId,
          owner: "p1",
          tile: 9,
          frozen: playerId === "p1" ? 0 : 2,
          charged: true,
        },
        DEFAULT_TIMINGS,
      )[0].durationMs;
    expect(stirred("p1")).toBe(DEFAULT_TIMINGS.snowHopMs);
    expect(stirred("p2")).toBe(DEFAULT_TIMINGS.noticeMs);
  });

  it("counts cards left in the turn, two once Double Cast is used", () => {
    expect(cardsLeftThisTurn(initial())).toBe(1);
    const doubled: MatchView = { ...initial(), abilityInUse: "doubleCast" };
    expect(cardsLeftThisTurn(doubled)).toBe(2);
    expect(cardsLeftThisTurn({ ...doubled, cardsPlayedThisTurn: 1 })).toBe(1);
  });
});
