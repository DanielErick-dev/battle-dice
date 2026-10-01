import type { AbilityId } from "@/game/domain/abilities";
import type { PlayerId } from "@/game/domain/types";

/**
 * Animation clips of a character model, built by scripts/characters/build-characters.mjs.
 * Every model has idle and run. Optional: intro plays once on the menus as the character is
 * picked, then showcase loops to present them (idle stands in without it); cast plays once as
 * they use their ability; float loops while they levitate (idle stands in without it); land plays
 * dash plays once as they throw themselves into a lightning dash, land as they touch down out of it.
 */
export type CharacterClip = "idle" | "run" | "cast" | "intro" | "showcase" | "float" | "dash" | "land";

/** Seconds each clip lasts, for the clips a model has. */
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
  /** A prop made in code, held in the right hand in the moves that use it (see HeldVial). */
  handProp?: "vial";
  /** Seconds into their cast clip when the hand prop is taken out (it's thrown at castImpactSeconds). */
  castPropSeconds?: number;
  /** Seconds into the intro when the held vial is tipped over and poured out, bursting into smoke. */
  introPourSeconds?: number;
  /** Hovers on the menu stage (floating instead of a showcase) with a staff in hand, as when levitating. */
  levitates?: boolean;
  /** Playing cards circle them through the intro and gather into their raised hand (see JesterCards). */
  introCards?: IntroCardBeats;
  /** A bow of light is drawn and an arrow loosed into the sky through the intro (see ArcherIntro). */
  introArrows?: IntroArrowBeats;
  /** Bones and skulls rise from the ground round them through the intro (see BoneRise). */
  introBones?: IntroBoneBeats;
  /**
   * Lightning trails their hands and feet through the intro and their lightning dash, and crackles
   * in their hands while it waits for the roll (see LimbLightning).
   */
  limbLightning?: boolean;
  /** Playback speed of their intro (1 by default); the intro's beats below are in the clip's own seconds. */
  introSpeed?: number;
  /** Seconds into the intro when a bolt falls from the sky and runs down their legs (with limbLightning). */
  introStrikeSeconds?: number;
  /** Uses their ability without moving (no cast clip, no leap, no burst): the effect is the show. */
  castsStill?: boolean;
  /** Seconds into their land clip when the feet touch the ground: the shockwave goes off. */
  landImpactSeconds?: number;
}

/** Beats of an intro the cards follow (see CharacterDefinition.introCards). */
export interface IntroCardBeats {
  /** Seconds into the intro when the pirouette starts: the ring whirls into a rising spiral. */
  spinSeconds: number;
  /** Seconds into the intro when the pose is struck: the cards gather into the raised hand. */
  revealSeconds: number;
}

/** Beats of an intro the bow of light follows (see CharacterDefinition.introArrows). */
export interface IntroArrowBeats {
  /** Seconds into the intro when the bow comes up and the string is drawn. */
  drawSeconds: number;
  /** Seconds into the intro when the arrow is loosed. */
  releaseSeconds: number;
}

/** Beats of an intro the rising bones follow (see CharacterDefinition.introBones). */
export interface IntroBoneBeats {
  /** Seconds into the intro when the arms start rising: the ground wakes. */
  raiseSeconds: number;
  /** Seconds into the intro when the arms are up: the skulls hang round the head. */
  peakSeconds: number;
  /** Seconds into the intro when the arms come down: the skulls burst into soul fire. */
  releaseSeconds: number;
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
  emeraldAlchemist: {
    name: "Alquimista Esmeralda",
    epithet: "Mestra das transmutações",
    color: "#10b981",
    model: model("emeraldAlchemist"),
    ability: "transmutation",
    playable: true,
    shieldColor: "#10b981",
    handProp: "vial",
    // Her cast: the vial comes off her belt at 0.9 s, is wound up behind her shoulder and
    // leaves her hand at 2.3 s, when the hand swings forward fastest.
    castPropSeconds: 0.9,
    castImpactSeconds: 2.3,
    // Her arm is out in front of her by then (tune by eye on the menu).
    introPourSeconds: 2.0,
  },
  wanderingSage: {
    name: "Monge Ancião",
    epithet: "A calma antes da tempestade",
    color: "#facc15",
    model: model("wanderingSage"),
    ability: "dormantFury",
    playable: true,
    shieldColor: "#facc15",
    // His intro (put together by the build, see manifest.mjs) is a capoeira ginga and a spinning
    // jump: the lightning follows every swing of his limbs. Using Dormant Fury, he stands charging
    // until the roll; out of the dash he drops from the sky and touches down 0.4 s into his land clip.
    limbLightning: true,
    // The spinning jump touches down 4.8 s into the intro clip (2.8 s of ginga, then 2 s of jump),
    // played a third faster.
    introSpeed: 1.35,
    introStrikeSeconds: 4.8,
    castsStill: true,
    landImpactSeconds: 0.4,
  },
  elvenArcher: {
    name: "Arqueira Élfica",
    epithet: "Flechas que caem do céu",
    // Leaf green, lighter and yellower than the Alchemist's emerald.
    color: "#84cc16",
    model: model("elvenArcher"),
    ability: "arrowRain",
    playable: true,
    shieldColor: "#84cc16",
    // Her intro: the bow comes up from 0.6 s, drawn and held, the arrow loosed at 2.65 s.
    introArrows: { drawSeconds: 0.6, releaseSeconds: 2.65 },
  },
  cardJester: {
    name: "Coringa Carmesim",
    epithet: "Quem aposta, arrisca",
    // Deep crimson, darker than the Witch's red.
    color: "#dc143c",
    model: model("cardJester"),
    ability: "cardGamble",
    playable: true,
    shieldColor: "#dc143c",
    // Her intro: a crouch, a pirouette from 1.5 s, then a pose with a hand held up from about 2.7 s.
    introCards: { spinSeconds: 1.5, revealSeconds: 2.7 },
  },
  boneShaman: {
    name: "Necromante",
    epithet: "O que foi jogado não morre",
    // Ghostly teal, the glow of spirits called back.
    color: "#2dd4bf",
    model: model("boneShaman"),
    ability: "resurrection",
    playable: true,
    shieldColor: "#2dd4bf",
    // His intro: the arms rise from 0.5 s, are up from 1.4 s and come down from 2.9 s.
    introBones: { raiseSeconds: 0.5, peakSeconds: 1.4, releaseSeconds: 2.9 },
  },
  fleshScribe: {
    name: "Escriba da Carne",
    epithet: "O que ele escreve, você paga",
    // Fuchsia, the glow of his runes; apart from the reds and the Void Knight's violet.
    color: "#d946ef",
    model: model("fleshScribe"),
    ability: "forbiddenSeals",
    playable: true,
    shieldColor: "#d946ef",
  },
  shadowWarden: {
    name: "Guardião das Sombras",
    epithet: "Sem rosto, sem rastro",
    // Ghostly blue, the glow of his apparitions.
    color: "#7dd3fc",
    model: model("shadowWarden"),
    ability: "spectralApparitions",
    playable: true,
    shieldColor: "#7dd3fc",
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
