import type { AbilityId } from "@/game/domain/abilities";
import type { PlayerId } from "@/game/domain/types";

/**
 * Animation clips of a character model, built by scripts/characters/build-characters.mjs.
 * Every model has idle and run. Optional: intro plays once on the menus as the character is
 * picked, then showcase loops to present them (idle stands in without it); cast plays once as
 * they use their ability; float loops while they levitate (idle stands in without it).
 */
export type CharacterClip = "idle" | "run" | "cast" | "intro" | "showcase" | "float";

/** Seconds each one-shot clip lasts, for the clips a model has. */
export type ClipLengths = Partial<Record<CharacterClip, number>>;

export interface CharacterDefinition {
  name: string;
  /** Short title under the name on the character picker. */
  epithet: string;
  /** Accent for the ring under the token, the HUD and the menus. */
  color: string;
  /** Rigged, animated GLB (see CharacterClip). */
  model: string;
  ability: AbilityId;
  /** Can be picked; the others show on the picker as coming soon (being remade). */
  playable: boolean;
  /** Blades of light appear in their hands during the intro (their modelled swords can't move). */
  energyBlades?: boolean;
  /** Seconds into their cast clip when the blow lands: the ability's burst waits for it. */
  castImpactSeconds?: number;
  /** Tint of their Arcane Shield bubble (cyan by default). */
  shieldColor?: string;
  /** Hovers on the menu stage (floating instead of a showcase) with a staff in hand, as when levitating. */
  levitates?: boolean;
}

const model = (id: string) => `/models/characters/${id}.glb`;

/** Every character, made with Meshy AI (see `playable`). The ids name the model files. */
export const CHARACTERS = {
  voidKnight: {
    name: "Cavaleiro do Vazio",
    epithet: "Guardião das sombras",
    color: "#8b5cf6",
    model: model("voidKnight"),
    ability: "trapWard",
    playable: true,
    energyBlades: true,
    // Both blades hit the ground as he drops to one knee.
    castImpactSeconds: 0.95,
  },
  crimsonEnchantress: {
    name: "Encantadora Carmesim",
    epithet: "Feiticeira de sangue",
    color: "#f43f5e",
    model: model("crimsonEnchantress"),
    ability: "doubleCast",
    playable: true,
  },
  eclipseQueen: {
    name: "Rainha do Eclipse",
    epithet: "Soberana da lua rubra",
    color: "#f97316",
    model: model("eclipseQueen"),
    ability: "crimsonMarch",
    playable: false,
  },
  blindSeraph: {
    name: "Serafim Vendado",
    epithet: "Anjo que vê sem olhos",
    color: "#fcd34d",
    model: model("blindSeraph"),
    ability: "celestialGrace",
    playable: false,
  },
  rosewingDragoness: {
    name: "Dragoa das Rosas",
    epithet: "Asas de pétalas e fogo",
    color: "#f472b6",
    model: model("rosewingDragoness"),
    ability: "dragonHoard",
    playable: false,
  },
  crimsonWitch: {
    name: "Bruxa Carmesim",
    epithet: "Senhora dos feitiços de sangue",
    color: "#ef4444",
    model: model("crimsonWitch"),
    ability: "levitation",
    playable: true,
    levitates: true,
    shieldColor: "#ef4444",
  },
} as const satisfies Record<string, CharacterDefinition>;

export type CharacterId = keyof typeof CHARACTERS;

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];
/** The characters that can be picked right now. */
export const PLAYABLE_CHARACTER_IDS = CHARACTER_IDS.filter((id) => CHARACTERS[id].playable);
export const DEFAULT_CHARACTER_ID: CharacterId = "crimsonWitch";

export function isCharacterId(id: string): id is CharacterId {
  return Object.hasOwn(CHARACTERS, id);
}

export function isPlayableCharacter(id: string): id is CharacterId {
  return isCharacterId(id) && CHARACTERS[id].playable;
}

/** A local player: plays as `id`, which also serves as their player id. */
export interface RosterEntry {
  id: CharacterId;
  name: string;
  ability: AbilityId;
}

export function rosterEntry(id: CharacterId): RosterEntry {
  const { name, ability } = CHARACTERS[id];
  return { id, name, ability };
}

/** Local players use their character id as player id, so the id finds the character. */
export function characterFor(playerId: PlayerId): CharacterDefinition | null {
  return isCharacterId(playerId) ? CHARACTERS[playerId] : null;
}

const FALLBACK_COLOR = "#38bdf8";

export function playerColor(playerId: PlayerId): string {
  return characterFor(playerId)?.color ?? FALLBACK_COLOR;
}
