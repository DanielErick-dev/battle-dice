import { describe, expect, it } from "vitest";
import { joinRefusalMessage, roomCodeFrom, seatOptions } from "./seats";
import { controllerId, saveSeat, savedSeat, type KeyValueStore } from "./identity";

function memoryStore(): KeyValueStore {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

describe("seatOptions", () => {
  it("shows each seat with its character and who holds it", () => {
    const seats = seatOptions({
      seats: [
        { playerId: "p1:witch", playerName: "Bruxa", controllerName: "Ana", character: null },
        { playerId: "p2", playerName: "Bran", controllerName: null, character: null },
      ],
      spectators: 1,
    });
    expect(seats[0]).toMatchObject({ playerName: "Bruxa", takenBy: "Ana" });
    expect(seats[0]?.character?.name).toBeTruthy();
    expect(seats[1]).toMatchObject({ character: null, takenBy: null });
  });

  it("is empty before presence arrives", () => {
    expect(seatOptions(null)).toEqual([]);
  });
});

describe("join helpers", () => {
  it("normalizes a typed room code", () => {
    expect(roomCodeFrom(" ab-c d ")).toBe("ABCD");
    expect(roomCodeFrom("OIL1")).toBeNull();
  });

  it("explains refusals and silence", () => {
    expect(joinRefusalMessage("SEAT_TAKEN")).toMatch(/pegou esse lugar/);
    expect(joinRefusalMessage(null)).toMatch(/Nenhuma sala/);
  });
});

describe("controller identity", () => {
  it("keeps one client id per store", () => {
    const store = memoryStore();
    let made = 0;
    const create = () => `id-${++made}`;
    expect(controllerId(store, create)).toBe("id-1");
    expect(controllerId(store, create)).toBe("id-1");
  });

  it("remembers the seat for its own room only", () => {
    const store = memoryStore();
    saveSeat(store, { room: "ABCD", seat: "p2", name: "Ana" });
    expect(savedSeat(store, "ABCD")).toEqual({ room: "ABCD", seat: "p2", name: "Ana" });
    expect(savedSeat(store, "WXYZ")).toBeNull();
    saveSeat(store, null);
    expect(savedSeat(store, "ABCD")).toBeNull();
  });

  it("survives storage that throws", () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(controllerId(broken, () => "fresh")).toBe("fresh");
    expect(savedSeat(broken, "ABCD")).toBeNull();
  });
});
