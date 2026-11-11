import { describe, expect, it } from "vitest";
import { abilityCycle } from "../abilities/charge";
import { CLASSIC_BOARD } from "../board/presets";
import type { GameCommand } from "./commands";
import { applyCommand, createGame, currentPlayer } from "./engine";
import { randomStream } from "./random";
import type { GameState } from "./state";

const PLAYERS = [
  { id: "p1", name: "Aria" },
  { id: "p2", name: "Bran", ability: "doubleCast" as const },
  { id: "p3", name: "Cael" },
];

/** Whatever the state asks for next: answer a full-hand discard, otherwise roll. */
function nextCommand(state: GameState): GameCommand {
  const { pendingDiscard } = state;
  if (pendingDiscard)
    return { type: "discardCard", playerId: pendingDiscard.playerId, cardUid: pendingDiscard.drawn.uid };
  return { type: "rollDice", playerId: currentPlayer(state).id };
}

/** Plays `commands` commands with the engine's own dice, restarting (and so reshuffling) after a win. */
function play(seed: number, commands = 60) {
  let state = createGame(CLASSIC_BOARD, PLAYERS, { seed });
  const log: GameCommand[] = [];
  for (let i = 0; i < commands; i++) {
    const command: GameCommand = state.status === "finished" ? { type: "restart" } : nextCommand(state);
    log.push(command);
    state = applyCommand(state, command).state;
  }
  return { state, log };
}

const rolls = (seed: number) => {
  let state = createGame(CLASSIC_BOARD, PLAYERS, { seed });
  return Array.from({ length: 6 }, () => {
    const { state: next, events } = applyCommand(state, nextCommand(state));
    state = next;
    return events.find((event) => event.type === "diceRolled");
  });
};

describe("replay", () => {
  it("the same seed and the same commands rebuild the very same state", () => {
    const { state, log } = play(1234);
    expect(log).toContainEqual({ type: "restart" });
    const replayed = log.reduce(
      (current, command) => applyCommand(current, command).state,
      createGame(CLASSIC_BOARD, PLAYERS, { seed: 1234 }),
    );
    expect(replayed).toEqual(state);
    expect(JSON.parse(JSON.stringify(replayed))).toEqual(state);
  });

  it("resolving the same command on the same state twice gives the same result", () => {
    const game = createGame(CLASSIC_BOARD, PLAYERS, { seed: 42 });
    const command: GameCommand = { type: "rollDice", playerId: "p1" };
    expect(applyCommand(game, command)).toEqual(applyCommand(game, command));
  });

  it("the random stream lives in the state and advances with every draw", () => {
    const game = createGame(CLASSIC_BOARD, PLAYERS, { seed: 99 });
    expect(game.rng.seed).toBe(99);
    expect(game.rng.counter).toBeGreaterThan(0);
    const { state } = applyCommand(game, { type: "rollDice", playerId: "p1" });
    expect(state.rng.counter).toBeGreaterThan(game.rng.counter);
  });

  it("another seed deals other dice", () => {
    expect(rolls(1)).toEqual(rolls(1));
    expect(rolls(1)).not.toEqual(rolls(2));
  });

  it("refuses a game without an integer seed", () => {
    expect(() => createGame(CLASSIC_BOARD, PLAYERS, { seed: 0.5 })).toThrow();
  });

  it("chargedAbilities starts every ability ready", () => {
    const game = createGame(CLASSIC_BOARD, PLAYERS, { seed: 1, chargedAbilities: true });
    expect(game.players.find((player) => player.id === "p2")?.abilityCharge).toBe(abilityCycle("doubleCast"));
  });
});

describe("randomStream", () => {
  it("resuming at a counter continues the same sequence", () => {
    const whole = randomStream({ seed: 5, counter: 0 });
    const first = Array.from({ length: 10 }, whole.random);
    const resumed = randomStream({ seed: 5, counter: 4 });
    expect(Array.from({ length: 6 }, resumed.random)).toEqual(first.slice(4));
    expect(resumed.snapshot()).toEqual({ seed: 5, counter: 10 });
  });
});
