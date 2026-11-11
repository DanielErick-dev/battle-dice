import { describe, expect, it } from "vitest";
import { CLASSIC_BOARD } from "../domain/board/presets";
import { sequenceDice } from "../domain/core/dice";
import { createGame } from "../domain/core/engine";
import { seededRandom } from "../domain/core/random";
import type { GameUpdate } from "./gameClient";
import { LocalGameClient } from "./localGameClient";

const PLAYERS = [
  { id: "p1", name: "Aria" },
  { id: "p2", name: "Bran" },
];

const local = () =>
  new LocalGameClient(createGame(CLASSIC_BOARD, PLAYERS), { rollDice: sequenceDice([3, 2]), random: seededRandom(1) });

describe("LocalGameClient", () => {
  it("connects at once as a hot-seat, at seq 0", async () => {
    const snapshot = await local().connect();

    expect(snapshot.seq).toBe(0);
    expect(snapshot.localPlayerId).toBeNull();
    expect(snapshot.state.players.map(({ id }) => id)).toEqual(["p1", "p2"]);
  });

  it("numbers each accepted command one after the other", async () => {
    const client = local();
    const updates: GameUpdate[] = [];
    client.subscribe((update) => updates.push(update));

    await client.send({ type: "rollDice", playerId: "p1" });
    await client.send({ type: "rollDice", playerId: "p2" });

    expect(updates.map(({ seq }) => seq)).toEqual([1, 2]);
    expect(updates[0]?.events.length).toBeGreaterThan(0);
    expect((await client.connect()).seq).toBe(2);
  });

  it("answers a rule refusal with its plain code, without an update", async () => {
    const client = local();
    const updates: GameUpdate[] = [];
    client.subscribe((update) => updates.push(update));

    const result = await client.send({ type: "rollDice", playerId: "p2" });

    expect(result).toEqual({ ok: false, code: "NOT_YOUR_TURN" });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(updates).toEqual([]);
    expect((await client.connect()).seq).toBe(0);
  });

  it("reconnects onto the latest state, as a resync after a drop would", async () => {
    const client = local();
    const updates: GameUpdate[] = [];
    client.subscribe((update) => updates.push(update));

    await client.send({ type: "rollDice", playerId: "p1" });
    const snapshot = await client.connect();

    expect(snapshot.seq).toBe(updates[0]?.seq);
    expect(snapshot.state).toBe(updates[0]?.state);
    expect(snapshot.state.currentPlayerIndex).toBe(1);
  });

  it("stops notifying a listener once it unsubscribes", async () => {
    const client = local();
    const updates: GameUpdate[] = [];
    const unsubscribe = client.subscribe((update) => updates.push(update));

    unsubscribe();
    const result = await client.send({ type: "rollDice", playerId: "p1" });

    expect(result).toEqual({ ok: true });
    expect(updates).toEqual([]);
  });

  it("stops notifying after close", async () => {
    const client = local();
    const updates: GameUpdate[] = [];
    client.subscribe((update) => updates.push(update));

    client.close();
    await client.send({ type: "rollDice", playerId: "p1" });

    expect(updates).toEqual([]);
  });
});
