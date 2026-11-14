import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalGameClient } from "@/game/application/localGameClient";
import { createGame } from "@/game/domain/core/engine";
import { startReplay } from "./replay";

afterEach(() => vi.useRealTimers());

describe("startReplay", () => {
  it("plays every recorded move back, one after the other, and takes no commands", async () => {
    vi.useFakeTimers();
    const players = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ];
    const live = new LocalGameClient(createGame({ size: 40, effects: {} }, players, { seed: 5 }));
    for (const id of ["a", "b", "a", "b"]) await live.send({ type: "rollDice", playerId: id });

    const replay = startReplay(live.recording);
    await vi.runAllTimersAsync();
    const view = replay.store.getSnapshot();
    expect(view?.players.map((player) => player.position)).toEqual(
      (await live.connect()).state.players.map((player) => player.position),
    );
    expect(view?.stats.a?.rolls).toBe(2);
    expect(replay.store.spectator).toBe(true);
    replay.stop();
  });
});
