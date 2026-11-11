import { describe, expect, it } from "vitest";
import { newRoomCode, parseRoomCode, ROOM_LETTERS } from "./roomCode";

describe("room codes", () => {
  it("are four easy letters", () => {
    for (let index = 0; index < 50; index++) {
      const code = newRoomCode();
      expect(code).toHaveLength(4);
      expect([...code].every((letter) => ROOM_LETTERS.includes(letter))).toBe(true);
    }
  });

  it("use the whole alphabet for any draw in [0, 1)", () => {
    expect(newRoomCode(() => 0)).toBe("AAAA");
    expect(newRoomCode(() => 0.999999)).toBe("ZZZZ");
  });

  it("leave out letters that read alike", () => {
    for (const letter of "ILOQUV01") expect(ROOM_LETTERS).not.toContain(letter);
  });

  it("parse what a person types, and nothing else", () => {
    expect(parseRoomCode(" kprw ")).toBe("KPRW");
    expect(parseRoomCode("KPRWX")).toBe("KPRWX");
    expect(parseRoomCode("KPR")).toBeNull();
    expect(parseRoomCode("KPOW")).toBeNull();
    expect(parseRoomCode(undefined)).toBeNull();
  });
});
