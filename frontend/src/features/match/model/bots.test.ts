import { afterEach, describe, expect, it, vi } from "vitest";
import { rosterOf } from "@/features/characters";
import { createLocalMatch } from "./createLocalMatch";

afterEach(() => vi.useRealTimers());

describe("computer players", () => {
  it("play a whole match on their own when every seat is a bot", async () => {
    vi.useFakeTimers();
    const match = createLocalMatch({ size: 20, effects: {} }, rosterOf(["witch", "zarek"]), { bots: [0, 1] });
    await match.store.open();
    const stop = match.startBots();
    for (let tick = 0; tick < 400 && match.store.getSnapshot()?.winnerId == null; tick++) {
      await vi.advanceTimersByTimeAsync(5000);
    }
    expect(match.store.getSnapshot()?.winnerId).not.toBeNull();
    stop();
    match.store.close();
  });
});
