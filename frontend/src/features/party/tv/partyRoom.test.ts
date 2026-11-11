import { describe, expect, it } from "vitest";
import { MatchHost, RemoteGameClient } from "@/game/application/party";
import { MemoryRoom } from "@/game/application/party/memoryTransport";
import { CLASSIC_BOARD } from "@/game/domain/board/presets";
import { createGame } from "@/game/domain/core/engine";
import { everySeatTaken, PartyRoom } from "./partyRoom";

const PLAYERS = [
  { id: "p1", name: "Aria" },
  { id: "p2", name: "Bran" },
];

function setup() {
  const memory = new MemoryRoom();
  const room = new PartyRoom(() => new MatchHost(createGame(CLASSIC_BOARD, PLAYERS, { seed: 1 }), memory.host));
  const phone = (clientId: string, name: string) =>
    new RemoteGameClient(() => memory.connect(), { clientId, role: "player", name });
  return { room, phone };
}

describe("PartyRoom", () => {
  it("has no host until opened and none after closing", () => {
    const { room } = setup();
    expect(room.getSnapshot().host).toBeNull();
    room.open();
    expect(room.getSnapshot().host).not.toBeNull();
    expect(room.getSnapshot().seats.map((seat) => seat.controllerName)).toEqual([null, null]);
    room.close();
    expect(room.getSnapshot()).toEqual({ host: null, seats: [] });
  });

  it("fills the seats as phones join and tells when all are taken", async () => {
    const { room, phone } = setup();
    room.open();
    await phone("a", "Ana").connect();
    expect(everySeatTaken(room.getSnapshot().seats)).toBe(false);
    await phone("b", "Beto").connect();
    expect(room.getSnapshot().seats.map((seat) => seat.controllerName)).toEqual(["Ana", "Beto"]);
    expect(everySeatTaken(room.getSnapshot().seats)).toBe(true);
    room.close();
  });

  it("remembers who dropped until the same phone joins back", async () => {
    const { room, phone } = setup();
    room.open();
    const ana = phone("a", "Ana");
    const first = () => room.getSnapshot().seats[0];
    await ana.connect();
    expect(first()).toMatchObject({ controllerName: "Ana", lastController: "Ana" });

    ana.close();
    expect(first()).toMatchObject({ controllerName: null, lastController: "Ana" });

    await phone("a", "Ana").connect();
    expect(first()).toMatchObject({ controllerName: "Ana", lastController: "Ana" });
    room.close();
  });

  it("swaps the host on reopen, so only one ever answers", async () => {
    const { room, phone } = setup();
    room.open();
    const first = room.getSnapshot().host;
    room.open();
    expect(room.getSnapshot().host).not.toBe(first);
    await phone("a", "Ana").connect();
    expect(first?.seats()[0]?.controllerName).toBeNull();
    room.close();
  });
});
