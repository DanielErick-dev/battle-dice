import type { AbilityId } from "@/game/domain/abilities/ability";
import type { PlayerId } from "@/game/domain/types";
import type { CharacterDefinition } from "./types";
import { zarek } from "./sheets/zarek";
import { enchantress } from "./sheets/enchantress";
import { witch } from "./sheets/witch";
import { alchemist } from "./sheets/alchemist";
import { monk } from "./sheets/monk";
import { archer } from "./sheets/archer";
import { jester } from "./sheets/jester";
import { necromancer } from "./sheets/necromancer";
import { scribe } from "./sheets/scribe";
import { warden } from "./sheets/warden";
import { kage } from "./sheets/kage";
import { fairy } from "./sheets/fairy";
import { zephyr } from "./sheets/zephyr";
import { themis } from "./sheets/themis";
import { akane } from "./sheets/akane";
import { bjorn } from "./sheets/bjorn";
import { auric } from "./sheets/auric";
import { seraphiel } from "./sheets/seraphiel";
import { cronos } from "./sheets/cronos";
import { alva } from "./sheets/alva";
import { vinicius } from "./sheets/vinicius";

export type * from "./types";

/** Every character, made with Meshy AI (see `playable`), in picker order. The ids name the model files. */
export const CHARACTERS = {
  zarek,
  enchantress,
  witch,
  alchemist,
  monk,
  archer,
  jester,
  necromancer,
  scribe,
  warden,
  kage,
  fairy,
  zephyr,
  themis,
  akane,
  bjorn,
  auric,
  seraphiel,
  cronos,
  alva,
  vinicius,
} as const satisfies Record<string, CharacterDefinition>;

export type CharacterId = keyof typeof CHARACTERS;

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];
/** The characters that can be picked right now. */
export const PLAYABLE_CHARACTER_IDS = CHARACTER_IDS.filter((id) => CHARACTERS[id].playable);
export const DEFAULT_CHARACTER_ID: CharacterId = "witch";

export function isCharacterId(id: string): id is CharacterId {
  return Object.hasOwn(CHARACTERS, id);
}

export function isPlayableCharacter(id: string): id is CharacterId {
  return isCharacterId(id) && CHARACTERS[id].playable;
}

/** At most this many players share a local match. */
export const MAX_LOCAL_PLAYERS = 8;

/**
 * The characters in a comma-separated list (as kept in the URL and the preferences): the playable
 * ones, at most MAX_LOCAL_PLAYERS, the default character when none is left.
 */
export function parseCharacterList(list: string): CharacterId[] {
  const ids = list.split(",").filter(isPlayableCharacter).slice(0, MAX_LOCAL_PLAYERS);
  return ids.length > 0 ? ids : [DEFAULT_CHARACTER_ID];
}

/** A local player: their player id and name, the character they play and its ability. */
export interface RosterEntry {
  id: PlayerId;
  name: string;
  ability: AbilityId;
  character: CharacterId;
}

/**
 * The players of a local match, one per character, in turn order. Several may play the same
 * character: the player id is their seat and character (`p2:witch`), and a character
 * played more than once is named with each one's seat.
 */
export function rosterOf(characters: readonly CharacterId[]): RosterEntry[] {
  return characters.map((character, index) => {
    const { name, ability } = CHARACTERS[character];
    const repeated = characters.filter((other) => other === character).length > 1;
    return { id: `p${index + 1}:${character}`, name: repeated ? `${name} ${index + 1}` : name, ability, character };
  });
}

/** The character a local player plays: what follows the seat in their id (see rosterOf). */
export function characterFor(playerId: PlayerId): CharacterDefinition | null {
  const id = playerId.slice(playerId.indexOf(":") + 1);
  return isCharacterId(id) ? CHARACTERS[id] : null;
}

const FALLBACK_COLOR = "#38bdf8";

export function playerColor(playerId: PlayerId): string {
  return characterFor(playerId)?.color ?? FALLBACK_COLOR;
}
