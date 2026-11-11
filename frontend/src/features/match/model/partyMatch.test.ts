import { describe, expect, it } from "vitest";
import { MatchHost, RemoteGameClient } from "@/game/application/party";
import { MemoryRoom } from "@/game/application/party/memoryTransport";
import { CLASSIC_BOARD } from "@/game/domain/board/presets";
import { createGame } from "@/game/domain/core/engine";
import { loadedDice } from "@/game/domain/testing";
import { MatchStore } from "./matchStore";

const PLAYERS = [
  { id: "p1", name: "Aria" },
  { id: "p2", name: "Bran" },
];

describe("MatchStore over the party transport", () => {
  it("runs a phone seat and a TV spectator with no change to the store", async () => {
    const room = new MemoryRoom();
    const host = new MatchHost(createGame(CLASSIC_BOARD, PLAYERS, { seed: 1 }), room.host, {
      resolve: loadedDice([3]),
    });
    const phone = new MatchStore(new RemoteGameClient(() => room.connect(), { clientId: "a", role: "player" }));
    const tv = new MatchStore(new RemoteGameClient(() => room.connect(), { clientId: "tv", role: "spectator" }));

    await Promise.all([phone.open(), tv.open()]);
    phone.rollDice();
    await Promise.resolve();

    expect(phone.pinnedSeat).toBe("p1");
    expect(host.seq).toBe(1);
    expect(tv.getSnapshot()?.players[0]?.id).toBe("p1");
    phone.close();
    tv.close();
    host.close();
  });
});
