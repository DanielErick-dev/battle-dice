import { afterEach, describe, expect, it, vi } from "vitest";
import { CLASSIC_BOARD } from "../../domain/board/presets";
import { createGame } from "../../domain/core/engine";
import { loadedDice, withPlayer } from "../../domain/testing";
import type { GameUpdate } from "../gameClient";
import { MatchHost, type MatchHostOptions } from "./matchHost";
import { MemoryRoom } from "./memoryTransport";
import type { JoinRequest } from "./remoteGameClient";
import { HostRefusedError, JoinRefusedError, RemoteGameClient } from "./remoteGameClient";
import { controllerChannel, hostChannel, partyChannelName } from "./transport";

const PLAYERS = [
  { id: "p1", name: "Aria" },
  { id: "p2", name: "Bran" },
];

// Aria starts with energy to burn, so a sacrifice draws a secret card mid-match.
function party(options: MatchHostOptions = {}) {
  const state = withPlayer(createGame(CLASSIC_BOARD, PLAYERS, { seed: 1 }), "p1", { energy: 5 });
  const room = new MemoryRoom();
  const host = new MatchHost(state, room.host, { resolve: loadedDice([3, 2, 4, 1]), ...options });
  const transports = new Map<string, ReturnType<MemoryRoom["connect"]>>();
  const client = (request: JoinRequest) =>
    new RemoteGameClient(() => {
      const transport = room.connect();
      transports.set(request.clientId, transport);
      return transport;
    }, request);
  const updates = (remote: RemoteGameClient) => {
    const received: GameUpdate[] = [];
    remote.subscribe((update) => received.push(update));
    return received;
  };
  const sentTo = (clientId: string) => room.sent.filter(({ to }) => to === clientId);
  return { state, room, host, client, updates, sentTo, transport: (id: string) => transports.get(id)! };
}

async function seated(options?: MatchHostOptions) {
  const setup = party(options);
  const aria = setup.client({ clientId: "phone-a", role: "player", name: "Ana" });
  const bran = setup.client({ clientId: "phone-b", role: "player", name: "Beto" });
  const tv = setup.client({ clientId: "tv", role: "spectator" });
  const snapshots = { aria: await aria.connect(), bran: await bran.connect(), tv: await tv.connect() };
  return { ...setup, aria, bran, tv, snapshots };
}

afterEach(() => vi.useRealTimers());

describe("party mode over a transport", () => {
  it("seats phones in order and the TV as a spectator", async () => {
    const { snapshots, host, aria } = await seated();

    expect(snapshots.aria.localPlayerId).toBe("p1");
    expect(snapshots.bran.localPlayerId).toBe("p2");
    expect(snapshots.tv.localPlayerId).toBeNull();
    expect(host.seats().map(({ controllerName }) => controllerName)).toEqual(["Ana", "Beto"]);
    expect(host.spectators).toBe(1);
    expect(aria.presence?.spectators).toBe(1);
  });

  it("plays commands from two phones and shows every seq to everyone", async () => {
    const { aria, bran, tv, updates } = await seated();
    const seen = [aria, bran, tv].map(updates);

    expect(await aria.send({ type: "rollDice", playerId: "p1" })).toEqual({ ok: true });
    expect(await bran.send({ type: "rollDice", playerId: "p2" })).toEqual({ ok: true });

    for (const received of seen) expect(received.map(({ seq }) => seq)).toEqual([1, 2]);
    expect(seen[2]?.[1]?.state.currentPlayerIndex).toBe(0);
  });

  it("never sends a seat's secrets to another seat or the TV", async () => {
    const { state, aria, bran, sentTo, snapshots } = await seated();
    await aria.send({ type: "sacrificeEnergy", playerId: "p1" });
    await aria.send({ type: "rollDice", playerId: "p1" });
    await bran.send({ type: "rollDice", playerId: "p2" });

    const secretsOf = (index: number) =>
      [...(state.players[index]?.hand ?? []), ...(state.players[index]?.deck ?? [])].map(({ uid }) => uid);
    const leaks = (clientId: string, secrets: string[]) => {
      const serialized = JSON.stringify(sentTo(clientId));
      return secrets.filter((uid) => serialized.includes(uid));
    };
    const drawn = sentTo("phone-a").flatMap((message) => (message.type === "update" ? message.events : []));
    expect(drawn.map(({ type }) => type)).toContain("cardDrawn");
    expect(leaks("phone-a", secretsOf(0)).length).toBeGreaterThan(0);
    expect(leaks("phone-b", secretsOf(0))).toEqual([]);
    expect(leaks("phone-a", secretsOf(1))).toEqual([]);
    expect(leaks("tv", [...secretsOf(0), ...secretsOf(1)])).toEqual([]);
    expect(snapshots.aria.state.players[0]?.hand).toEqual(state.players[0]?.hand);
    expect(snapshots.tv.state.rng).toEqual({ seed: 0, counter: 0 });
  });

  it("refuses an out-of-turn command with the rule code and a foreign seat with a host code", async () => {
    const { aria, bran, tv, host, updates } = await seated();
    const seen = updates(tv);

    expect(await bran.send({ type: "rollDice", playerId: "p2" })).toEqual({ ok: false, code: "NOT_YOUR_TURN" });
    await expect(bran.send({ type: "rollDice", playerId: "p1" })).rejects.toEqual(
      new HostRefusedError("NOT_YOUR_SEAT"),
    );
    await expect(tv.send({ type: "rollDice", playerId: "p1" })).rejects.toEqual(new HostRefusedError("NOT_SEATED"));
    await expect(aria.send({ type: "restart" })).rejects.toEqual(new HostRefusedError("RESTART_NOT_ALLOWED"));
    expect(seen).toEqual([]);
    expect(host.seq).toBe(0);

    expect(await host.restart()).toEqual({ ok: true });
    expect(seen.map(({ seq }) => seq)).toEqual([1]);
  });

  it("lets seated controllers restart when the host allows it", async () => {
    const { aria, host } = await seated({ restart: "anyone" });
    expect(await aria.send({ type: "restart" })).toEqual({ ok: true });
    expect(host.seq).toBe(1);
  });

  it("replays the updates a phone missed once it notices the gap", async () => {
    const { aria, bran, transport, updates } = await seated();
    const seen = updates(bran);

    transport("phone-b").offline = true;
    await aria.send({ type: "rollDice", playerId: "p1" });
    transport("phone-b").offline = false;
    expect(seen).toEqual([]);

    expect(await bran.send({ type: "rollDice", playerId: "p2" })).toEqual({ ok: true });
    expect(seen.map(({ seq }) => seq)).toEqual([1, 2]);
    expect(seen[0]?.events.length).toBeGreaterThan(0);
  });

  it("falls back to a fresh snapshot when the missed updates are no longer kept", async () => {
    const { aria, bran, host, transport, updates } = await seated({ historySize: 1 });
    const seen = updates(bran);

    transport("phone-b").offline = true;
    await aria.send({ type: "rollDice", playerId: "p1" });
    transport("phone-b").offline = false;
    await bran.send({ type: "rollDice", playerId: "p2" });

    expect(seen.map(({ seq, events }) => [seq, events.length])).toEqual([[2, 0]]);
    expect(seen[0]?.state.players[1]?.hand).toEqual(host.state.players[1]?.hand);
  });

  it("gives a reconnecting phone its seat back at the current seq", async () => {
    const { aria, bran, client } = await seated();
    await aria.send({ type: "rollDice", playerId: "p1" });

    bran.close();
    const again = await client({ clientId: "phone-b", role: "player" }).connect();

    expect(again.localPlayerId).toBe("p2");
    expect(again.seq).toBe(1);
  });

  it("reopens the same client after close, as MatchStore does under StrictMode", async () => {
    const { bran } = await seated();
    bran.close();
    expect((await bran.connect()).localPlayerId).toBe("p2");
  });

  it("refuses a seat when the room is full, taken or unknown", async () => {
    const { client } = await seated();

    await expect(client({ clientId: "phone-c", role: "player" }).connect()).rejects.toEqual(
      new JoinRefusedError("ROOM_FULL"),
    );
    await expect(client({ clientId: "phone-c", role: "player", seat: "p1" }).connect()).rejects.toEqual(
      new JoinRefusedError("SEAT_TAKEN"),
    );
    await expect(client({ clientId: "phone-c", role: "player", seat: "p9" }).connect()).rejects.toEqual(
      new JoinRefusedError("UNKNOWN_SEAT"),
    );
  });

  it("hands a released seat to another phone and tells the old one", async () => {
    const { bran, host, client } = await seated();
    const closed = vi.fn();
    bran.onClosed(closed);

    host.releaseSeat("p2");
    const newcomer = await client({ clientId: "phone-c", role: "player", name: "Caio" }).connect();

    expect(closed).toHaveBeenCalledWith("SEAT_RELEASED");
    expect(newcomer.localPlayerId).toBe("p2");
    expect(host.seats()[1]?.controllerName).toBe("Caio");
  });

  it("tells everyone when the host closes", async () => {
    const { aria, tv, host } = await seated();
    const closed = vi.fn();
    aria.onClosed(closed);
    tv.onClosed(closed);

    host.close();

    expect(closed.mock.calls).toEqual([["HOST_CLOSED"], ["HOST_CLOSED"]]);
  });

  it("times out when no host answers", async () => {
    vi.useFakeTimers();
    const lonely = new RemoteGameClient(() => new MemoryRoom().connect(), { clientId: "x", role: "spectator" });
    const joining = lonely.connect();
    vi.advanceTimersByTime(8000);
    await expect(joining).rejects.toThrow("did not answer");
  });
});

describe("BroadcastChannel transport", () => {
  it("names one channel per room code", () => {
    expect(partyChannelName(" abcd ")).toBe(partyChannelName("ABCD"));
    expect(partyChannelName("ABCD")).not.toBe(partyChannelName("WXYZ"));
  });

  it("plays a match between tabs on the same room", async () => {
    const host = new MatchHost(createGame(CLASSIC_BOARD, PLAYERS, { seed: 1 }), hostChannel("TEST"));
    const phone = new RemoteGameClient(() => controllerChannel("test"), { clientId: "a", role: "player" });
    const other = new RemoteGameClient(() => controllerChannel("test"), { clientId: "b", role: "player" });

    expect((await phone.connect()).localPlayerId).toBe("p1");
    expect((await other.connect()).localPlayerId).toBe("p2");
    expect(await phone.send({ type: "rollDice", playerId: "p1" })).toEqual({ ok: true });

    phone.close();
    other.close();
    host.close();
  });
});
