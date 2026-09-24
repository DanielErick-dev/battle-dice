import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalGameClient } from "@/game/application/localGameClient";
import { CLASSIC_BOARD } from "@/game/domain/board";
import { sequenceDice } from "@/game/domain/dice";
import { createGame } from "@/game/domain/engine";
import { MatchStore } from "../model/matchStore";
import { connectMatchAudio } from "./matchAudio";
import type { MatchSounds } from "./soundEffects";

function setup(rolls: number[], start = 1) {
  const game = createGame(CLASSIC_BOARD, [{ id: "p1", name: "Goku" }]);
  const positioned = { ...game, players: game.players.map((player) => ({ ...player, position: start })) };
  const store = new MatchStore(new LocalGameClient(positioned, { rollDice: sequenceDice(rolls) }));
  store.connect();

  const played: string[] = [];
  const record = (name: keyof MatchSounds) => () => void played.push(name);
  const sounds: MatchSounds = {
    diceShake: record("diceShake"),
    diceLand: record("diceLand"),
    step: record("step"),
    leap: record("leap"),
    portal: record("portal"),
    trap: record("trap"),
    win: record("win"),
  };
  connectMatchAudio(store, sounds);
  return { store, played };
}

describe("connectMatchAudio", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("plays dice, one step per tile, then the portal and its leap", () => {
    const { store, played } = setup([4]);

    store.rollDice();
    vi.runAllTimers();

    expect(played).toEqual(["diceShake", "diceLand", "step", "step", "step", "step", "portal", "leap"]);
  });

  it("plays the trap and the victory", () => {
    const trap = setup([1], 7);
    trap.store.rollDice();
    vi.runAllTimers();
    expect(trap.played.slice(-2)).toEqual(["trap", "leap"]);

    const win = setup([1], 19);
    win.store.rollDice();
    vi.runAllTimers();
    expect(win.played.at(-1)).toBe("win");
  });
});
