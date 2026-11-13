import { afterEach, describe, expect, it, vi } from "vitest";
import { MatchHost, RemoteGameClient, type JoinRequest } from "@/game/application/party";
import { MemoryRoom, type MemoryControllerTransport } from "@/game/application/party/memoryTransport";
import { CLASSIC_BOARD } from "@/game/domain/board/presets";
import { createGame } from "@/game/domain/core/engine";
import { loadedDice } from "@/game/domain/testing";
import { ControllerConnection } from "./connection";

const PLAYERS = [
  { id: "p1", name: "Aria" },
  { id: "p2", name: "Bran" },
];

function room() {
  const memory = new MemoryRoom();
  const host = new MatchHost(createGame(CLASSIC_BOARD, PLAYERS, { seed: 1 }), memory.host, {
    resolve: loadedDice([3, 2, 4, 1]),
  });
  let last: MemoryControllerTransport | null = null;
  const client = (request: JoinRequest) =>
    new RemoteGameClient(
      () => {
        last = memory.connect();
        return last;
      },
      request,
      { timeoutMs: 50 },
    );
  const connection = (request: JoinRequest) => new ControllerConnection(client(request), { retryMs: 100 });
  return { host, client, connection, lastTransport: () => last };
}

afterEach(() => vi.useRealTimers());

describe("ControllerConnection", () => {
  it("joins the seat it asked for and goes live", async () => {
    const { connection } = room();
    const phone = connection({ clientId: "a", role: "player", seat: "p2", name: "Ana" });
    phone.start();
    await vi.waitFor(() => expect(phone.getStatus()).toEqual({ kind: "live" }));
    expect(phone.store.pinnedSeat).toBe("p2");
    phone.dispose();
  });

  it("fails the first join with the host's reason", async () => {
    const { connection } = room();
    const first = connection({ clientId: "a", role: "player", seat: "p1" });
    first.start();
    await vi.waitFor(() => expect(first.getStatus().kind).toBe("live"));
    const second = connection({ clientId: "b", role: "player", seat: "p1" });
    second.start();
    await vi.waitFor(() => expect(second.getStatus()).toEqual({ kind: "failed", reason: "SEAT_TAKEN" }));
  });

  it("fails with no reason when no room answers", async () => {
    vi.useFakeTimers();
    const phone = new ControllerConnection(
      new RemoteGameClient(() => new MemoryRoom().connect(), { clientId: "a", role: "player" }, { timeoutMs: 50 }),
    );
    phone.start();
    await vi.advanceTimersByTimeAsync(60);
    expect(phone.getStatus()).toEqual({ kind: "failed", reason: null });
  });

  it("reconnects to the same seat after a send goes unanswered", async () => {
    vi.useFakeTimers();
    const { connection, lastTransport, host } = room();
    const phone = connection({ clientId: "a", role: "player", seat: "p1" });
    phone.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(phone.getStatus().kind).toBe("live");

    const transport = lastTransport();
    if (transport) transport.offline = true;
    phone.store.rollDice();
    await vi.advanceTimersByTimeAsync(60);
    expect(phone.getStatus()).toEqual({ kind: "reconnecting", attempt: 1 });

    await vi.advanceTimersByTimeAsync(100);
    expect(phone.getStatus()).toEqual({ kind: "live" });
    expect(phone.store.pinnedSeat).toBe("p1");
    // The roll reached the host even though its answer was lost; the fresh snapshot has it.
    expect(host.seq).toBe(1);
    expect(phone.store.getSnapshot()?.activePlayerId).toBe("p2");
    phone.dispose();
  });

  it("gives up when another phone took the seat meanwhile", async () => {
    vi.useFakeTimers();
    const { connection, lastTransport, client } = room();
    const phone = connection({ clientId: "a", role: "player", seat: "p1" });
    phone.start();
    await vi.advanceTimersByTimeAsync(0);
    const transport = lastTransport();
    if (transport) transport.offline = true;
    phone.store.rollDice();
    await vi.advanceTimersByTimeAsync(60);

    const thief = client({ clientId: "b", role: "player", seat: "p1" });
    await thief.connect();
    await vi.advanceTimersByTimeAsync(100);
    expect(phone.getStatus()).toEqual({ kind: "closed", reason: "SEAT_LOST" });
  });

  it("closes when the host ends the match or frees the seat", async () => {
    const { connection, host } = room();
    const ana = connection({ clientId: "a", role: "player", seat: "p1" });
    const beto = connection({ clientId: "b", role: "player", seat: "p2" });
    ana.start();
    beto.start();
    await vi.waitFor(() => expect(beto.getStatus().kind).toBe("live"));

    host.releaseSeat("p1");
    expect(ana.getStatus()).toEqual({ kind: "closed", reason: "SEAT_RELEASED" });
    host.close();
    expect(beto.getStatus()).toEqual({ kind: "closed", reason: "HOST_CLOSED" });
  });
  it("starts reconnecting as soon as the link drops, without waiting for a send to time out", async () => {
    const { connection, lastTransport } = room();
    const phone = connection({ clientId: "a", role: "player", seat: "p1", name: "Ana" });
    phone.start();
    await vi.waitFor(() => expect(phone.getStatus()).toEqual({ kind: "live" }));
    lastTransport()?.drop();
    expect(phone.getStatus()).toEqual({ kind: "reconnecting", attempt: 1 });
    await vi.waitFor(() => expect(phone.getStatus()).toEqual({ kind: "live" }));
    phone.dispose();
  });
});
