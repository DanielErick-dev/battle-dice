import { describe, expect, it } from "vitest";
import type { BoardDefinition } from "../../board/board";
import type { GameState } from "../../core/state";
import {
  card,
  eventsOfType,
  expectRuleError,
  newGame,
  onTurnOf,
  play,
  playerOf,
  roll,
  send,
  withPlayer,
  withPlayers,
} from "../../testing";
import { APEX_PULLS, APEX_TURNS } from "./apex";
import { riftsOf } from "./rifts";

const BOARD: BoardDefinition = { size: 120, effects: {} };

const trio = () => newGame(BOARD, { zarek: "theVoid", rival: "doubleCast", tank: "untamed" });
const withApex = (state: GameState) =>
  withPlayer(state, "zarek", { hand: [card("voidApex")], energy: 10, position: 10 });

describe("Void Apex", () => {
  it(`throws every opponent not protected into the Void for ${APEX_TURNS} of their turns`, () => {
    const start = withPlayers(withApex(trio()), { tank: { untamed: 2 } });
    const { state } = play(start, "zarek", "test:voidApex");
    expect(playerOf(state, "rival").voidBound).toEqual({ owner: "zarek", turns: APEX_TURNS });
    expect(playerOf(state, "tank").voidBound).toBeNull();
  });

  it("walks Zarek with the rolls thrown from inside, leaving the roller where they stand", () => {
    const start = withPlayers(trio(), { rival: { position: 30, voidBound: { owner: "zarek", turns: APEX_TURNS } } });
    const { state, events } = roll(onTurnOf(start, "rival"), "rival", 5);
    expect(playerOf(state, "rival").position).toBe(30);
    expect(playerOf(state, "zarek").position - playerOf(start, "zarek").position).toBe(5);
    expect(eventsOfType(events, "voidRollTaken")[0]).toMatchObject({ playerId: "zarek", victimId: "rival", value: 5 });
  });

  it("lets no card work from inside the Void", () => {
    const start = withPlayers(onTurnOf(trio(), "rival"), {
      rival: { hand: [card("windStep")], energy: 10, voidBound: { owner: "zarek", turns: APEX_TURNS } },
    });
    expectRuleError(() => play(start, "rival", "test:windStep"), "IN_THE_VOID");
  });

  it(`lets them out after ${APEX_TURNS} of their turns`, () => {
    let state = withPlayers(trio(), { rival: { voidBound: { owner: "zarek", turns: APEX_TURNS } } });
    for (let turn = 0; turn < APEX_TURNS; turn++) state = roll(onTurnOf(state, "rival"), "rival", 1).state;
    expect(playerOf(state, "rival").voidBound).toBeNull();
    const before = playerOf(state, "rival").position;
    expect(playerOf(roll(onTurnOf(state, "rival"), "rival", 3).state, "rival").position).toBe(before + 3);
  });

  it(`pulls up to ${APEX_PULLS} of his own rifts back into the Void`, () => {
    let state = withPlayer(trio(), "zarek", {
      zarek: { hold: Array.from({ length: 4 }, () => ({ kind: "skipTurn" as const })), idle: 0 },
      energy: 10,
    });
    for (const tile of [20, 30, 40, 50]) {
      state = send(state, { type: "placeVoid", playerId: "zarek", index: 0, tile, doubled: false }).state;
    }
    expect(playerOf(state, "zarek").zarek.hold).toHaveLength(0);
    const { state: after } = play(withApex(state), "zarek", "test:voidApex");
    expect(playerOf(after, "zarek").zarek.hold).toHaveLength(APEX_PULLS);
    const armed = riftsOf(after.board).filter((rift) => !after.destroyedTraps.includes(rift.id));
    expect(armed).toHaveLength(4 - APEX_PULLS);
  });
});
