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
    expect(parseCharacterList("crimsonWitch,nobody,eclipseQueen,cardJester")).toEqual(["crimsonWitch", "cardJester"]);
    expect(parseCharacterList(Array(6).fill("cardJester").join(","))).toHaveLength(MAX_LOCAL_PLAYERS);
    expect(parseCharacterList("")).toEqual([DEFAULT_CHARACTER_ID]);
  });

  it("seats one player per character, the same character more than once if picked", () => {
    const roster = rosterOf(["crimsonWitch", "voidKnight", "crimsonWitch"]);
    expect(roster.map(({ id }) => id)).toEqual(["p1:crimsonWitch", "p2:voidKnight", "p3:crimsonWitch"]);
    expect(new Set(roster.map(({ id }) => id)).size).toBe(3);
    expect(roster.map(({ name }) => name)).toEqual([
      `${CHARACTERS.crimsonWitch.name} 1`,
      CHARACTERS.voidKnight.name,
      `${CHARACTERS.crimsonWitch.name} 3`,
    ]);
    expect(roster[1].ability).toBe(CHARACTERS.voidKnight.ability);
  });

  it("finds a player's character from their id", () => {
    expect(characterFor("p2:voidKnight")).toBe(CHARACTERS.voidKnight);
    expect(characterFor("cardJester")).toBe(CHARACTERS.cardJester);
    expect(characterFor("p1:nobody")).toBeNull();
  });
});
