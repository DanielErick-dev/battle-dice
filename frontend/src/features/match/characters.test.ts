import { describe, expect, it } from "vitest";
import {
  characterFor,
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  MAX_LOCAL_PLAYERS,
  parseCharacterList,
  rosterOf,
} from "./characters";

describe("local players", () => {
  it("keeps the playable characters of a list, in order, at most MAX_LOCAL_PLAYERS", () => {
    expect(parseCharacterList("witch,nobody,eclipseQueen,jester")).toEqual(["witch", "jester"]);
    expect(parseCharacterList(Array(6).fill("jester").join(","))).toHaveLength(MAX_LOCAL_PLAYERS);
    expect(parseCharacterList("")).toEqual([DEFAULT_CHARACTER_ID]);
  });

  it("seats one player per character, the same character more than once if picked", () => {
    const roster = rosterOf(["witch", "zarek", "witch"]);
    expect(roster.map(({ id }) => id)).toEqual(["p1:witch", "p2:zarek", "p3:witch"]);
    expect(new Set(roster.map(({ id }) => id)).size).toBe(3);
    expect(roster.map(({ name }) => name)).toEqual([
      `${CHARACTERS.witch.name} 1`,
      CHARACTERS.zarek.name,
      `${CHARACTERS.witch.name} 3`,
    ]);
    expect(roster[1].ability).toBe(CHARACTERS.zarek.ability);
  });

  it("finds a player's character from their id", () => {
    expect(characterFor("p2:zarek")).toBe(CHARACTERS.zarek);
    expect(characterFor("jester")).toBe(CHARACTERS.jester);
    expect(characterFor("p1:nobody")).toBeNull();
  });
});
