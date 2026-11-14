import { describe, expect, it } from "vitest";
import { createGame } from "../domain/core/engine";
import { LocalGameClient } from "./localGameClient";
import { ReplayGameClient } from "./replayGameClient";
import type { GameState } from "../domain/types";

const board = { size: 40, effects: {} };
const players = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
];

describe("ReplayGameClient", () => {
  it("replays a recorded match into the very same state", async () => {
    const live = new LocalGameClient(createGame(board, players, { seed: 99 }));
    let last: GameState | null = null;
    live.subscribe((update) => (last = update.state));
    for (let turn = 0; turn < 6; turn++) await live.send({ type: "rollDice", playerId: turn % 2 === 0 ? "a" : "b" });

    const replay = new ReplayGameClient(live.recording);
    let replayed: GameState | null = null;
    replay.subscribe((update) => (replayed = update.state));
    await replay.connect();
    while (replay.step());
    expect(replay.done).toBe(true);
    expect(replayed).toEqual(last);
  });

  it("refuses commands: it only plays back", async () => {
    const replay = new ReplayGameClient({ opening: createGame(board, players, { seed: 1 }), commands: [] });
    expect(await replay.send()).toEqual({ ok: false, code: "NOT_YOUR_TURN" });
  });
});
