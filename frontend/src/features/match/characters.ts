import type { AbilityId } from "@/game/domain/abilities";
import type { PlayerId } from "@/game/domain/types";
import type { SceneryId } from "@/features/menu/stage/scenery";
import type { ChairId } from "./scene/character/RestChair";
import type { WingsId } from "./scene/character/Wings";

/**
 * Animation clips of a character model, built by scripts/characters/build-characters.mjs.
 * Every model has idle and run. Optional: intro plays once on the menus as the character is
 * picked, then showcase loops to present them (idle stands in without it); cast plays once as
 * they use their ability; float loops while they levitate (idle stands in without it); land plays
 * dash plays once as they throw themselves into a lightning dash, land as they touch down out of it.
 * shove plays once as the Berserker shoves someone he trampled; knocked as anyone is sent flying
 * (every model borrows it from one, see SHARED_CLIPS in the build manifest); rest loops, seated on a
 * chair, while they've lost turns (shared the same way); hop plays once as the Crystal Fairy stops on
 * her own snow, before it carries her on.
 */
export type CharacterClip =
  "idle" | "run" | "cast" | "intro" | "showcase" | "float" | "dash" | "land" | "shove" | "knocked" | "rest" | "hop";

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
  /** Holds the frost wand (see FrostWand) through the intro and while using the ability, instead of leaping. */
  wand?: boolean;
  /** Seconds into their hop clip when the feet leave the ground (a burst of snow round them). */
  hopTakeoffSeconds?: number;
  /** Her intro: the hand that holds the wand up, and when snow and fairy dust pour off it (seconds). */
  introWand?: { hand: "LeftHand" | "RightHand"; from: number; to: number };
  /** Wears wings on the back (see Wings): the models are made without them. */
  wings?: WingsId;
  /** Seraphiel's wings once he has fallen (with fallenModel). */
  fallenWings?: WingsId;
  /** Seraphiel's chair once he has fallen. */
  fallenChair?: ChairId;
  /** Their own chair to sit on while they've lost turns (see RestChair); a plain wooden one without. */
  chair?: ChairId;
  /** Seconds into their cast clip when the hand prop is taken out (it's thrown at castImpactSeconds). */
  castPropSeconds?: number;
  /** Seconds into the intro when the held vial is tipped over and poured out, bursting into smoke. */
  introPourSeconds?: number;
  /** Hovers on the menu stage (floating instead of a showcase) with a staff in hand, as when levitating. */
  levitates?: boolean;
  /** Their menu intro is a descent out of heaven in a column of light, landing on the pedestal (see HeavenDescent). */
  descends?: boolean;
  /** Playing cards circle them through the intro and gather into their raised hand (see JesterCards). */
  introCards?: IntroCardBeats;
  /** A bow of light is drawn and an arrow loosed into the sky through the intro (see ArcherIntro). */
  introArrows?: IntroArrowBeats;
  /** Through the intro they write a sigil in the air that bursts into four scrolls (see ScribeIntro). */
  introSeals?: IntroSealBeats;
  /** Bones and skulls rise from the ground round them through the intro (see BoneRise). */
  introBones?: IntroBoneBeats;
  /** Frost gathers on their fist and the floor freezes over where it slams down in the intro (see FrostSlam). */
  introFrost?: IntroFrostBeats;
  /** The ground they stand on in the menu, in place of the rune pedestal (see menu/stage/scenery). */
  stage?: SceneryId;
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
  /** Seconds into their shove clip when the hands hit (a trample's blow, see Untamed). */
  shoveImpactSeconds?: number;
  /**
   * Their ability takes hold as an aura of their own (at castImpactSeconds into the cast) in place
   * of the generic burst, and stays while it lasts (see FrostAura).
   */
  castAura?: "frost";
  /** Their armour (Spectral Armour and the like) shows as a look of their own instead of the shield bubble. */
  armourLook?: "susanoo";
  /**
   * Seraphiel's form after the Fall (see seraph.ts), with the same clips; until it's made, his own
   * model is drawn charred instead.
   */
  fallenModel?: string;
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

/** Beats of an intro the frost follows (see CharacterDefinition.introFrost). */
export interface IntroFrostBeats {
  /** Seconds into the intro when the fist starts rising: frost gathers round it. */
  raiseSeconds: number;
  /** Seconds into the intro when the fist hits the floor: it freezes over and ice bursts out. */
  impactSeconds: number;
}

/** Beats of an intro the sigil and scrolls follow (see CharacterDefinition.introSeals). */
export interface IntroSealBeats {
  /** Seconds into the intro when the finger starts writing, and when the writing is done. */
  writeSeconds: number;
  writtenSeconds: number;
  /** Seconds into the intro when the arms go up: the sigil bursts into scrolls. */
  raiseSeconds: number;
  /** Seconds into the intro when the arms come down: the scrolls burn away. */
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
  crimsonWitch: {
    name: "Bruxa Carmesim",
    epithet: "Senhora dos feitiços de sangue",
    color: "#ef4444",
    model: model("crimsonWitch"),
    chair: "crimsonThrone",
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
    chair: "alchemistThrone",
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
    chair: "stormThrone",
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
    chair: "elderwoodThrone",
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
    chair: "jesterThrone",
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
    chair: "necromancerThrone",
    ability: "resurrection",
    playable: true,
    shieldColor: "#2dd4bf",
    // His intro: the arms rise from 0.5 s, are up from 1.4 s and come down from 2.9 s.
    introBones: { raiseSeconds: 0.5, peakSeconds: 1.4, releaseSeconds: 2.9 },
    stage: "graveyard",
  },
  fleshScribe: {
    name: "Escriba da Carne",
    epithet: "O que ele escreve, você paga",
    // Fuchsia, the glow of his runes; apart from the reds and the Void Knight's violet.
    color: "#d946ef",
    model: model("fleshScribe"),
    chair: "scribeThrone",
    ability: "forbiddenSeals",
    playable: true,
    shieldColor: "#d946ef",
    // His intro: he writes from 0.7 s to 3.3 s, throws his arms up at 4.4 s and lowers them at 7.15 s.
    introSeals: { writeSeconds: 0.7, writtenSeconds: 3.3, raiseSeconds: 4.4, releaseSeconds: 7.15 },
    stage: "scriptorium",
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
  purgatoryKunoichi: {
    name: "Kage Rubra",
    epithet: "O olhar que queima",
    // Scarlet flame, apart from the crimsons and pinks of the other reds.
    color: "#ff4d2e",
    model: model("purgatoryKunoichi"),
    chair: "obsidianThrone",
    ability: "ocularAwakening",
    playable: true,
    shieldColor: "#ff4d2e",
    armourLook: "susanoo",
  },
  crystalFairy: {
    name: "Fada Cristalina",
    epithet: "O encanto que cura o caminho",
    // Bright cyan, the glint of her crystals; brighter and greener than the Warden's blue.
    color: "#22d3ee",
    model: model("crystalFairy"),
    ability: "fairyBloom",
    playable: true,
    shieldColor: "#22d3ee",
    wand: true,
    // Her intro: she raises her left hand from 0.4 s and gazes at it, lowering it again by 2.7 s.
    introWand: { hand: "LeftHand", from: 0.6, to: 2.7 },
    // Her hop on her own snow: a crouch, off the ground at 1.1 s, highest at 1.4 s, down at 1.8 s.
    hopTakeoffSeconds: 1.1,
    wings: "fairy",
    chair: "frostThrone",
  },
  // The eight below came from Meshy with idle and run only: names and abilities are placeholders
  // until their kits (intro, cast, effects) are made. Bjorn's is under way: Untamed and his trample.
  windGuardian: {
    name: "Zéfiro",
    epithet: "O vento sempre a favor",
    // Mint, the colour of a clear gust.
    color: "#86efac",
    model: model("windGuardian"),
    ability: "tailwind",
    playable: true,
    shieldColor: "#86efac",
  },
  tideMaiden: {
    name: "Nerissa",
    epithet: "Os olhos vendados, o escudo nunca erra",
    color: "#2563eb",
    model: model("tideMaiden"),
    ability: "sacredBulwark",
    playable: true,
    shieldColor: "#2563eb",
    stage: "shore",
  },
  crimsonStudent: {
    name: "Akane",
    epithet: "Lição decorada, carta na mão",
    color: "#f9a8d4",
    model: model("crimsonStudent"),
    ability: "studySession",
    playable: true,
    shieldColor: "#f9a8d4",
    chair: "infernalThrone",
  },
  frostfangBerserker: {
    name: "Bjorn Presa-Gélida",
    epithet: "Quem fica no caminho, voa",
    color: "#60a5fa",
    model: model("frostfangBerserker"),
    ability: "untamed",
    chair: "wolfThrone",
    playable: true,
    shieldColor: "#60a5fa",
    // His intro: the left fist goes up from 0.3 s and slams the ground at 1 s.
    introFrost: { raiseSeconds: 0.3, impactSeconds: 1 },
    // His cast: the fists come up onto his chest by 0.8 s. His shove: the hands hit at 0.25 s.
    castImpactSeconds: 0.8,
    shoveImpactSeconds: 0.25,
    castAura: "frost",
    stage: "tundra",
  },
  goldenGuardian: {
    name: "Auric",
    epithet: "Senhor das marés douradas",
    color: "#f59e0b",
    model: model("goldenGuardian"),
    chair: "tideThrone",
    ability: "cleansingTide",
    playable: true,
    shieldColor: "#f59e0b",
    stage: "sunkenTemple",
  },
  seraphGuardian: {
    name: "Seraphiel",
    epithet: "Asas que abençoam o caminho",
    color: "#fef3c7",
    model: model("seraphGuardian"),
    fallenModel: model("fallenSeraph"),
    ability: "seraphBlessing",
    playable: true,
    shieldColor: "#fde68a",
    wings: "seraph",
    fallenWings: "fallen",
    chair: "celestialThrone",
    fallenChair: "ashenThrone",
    descends: true,
    stage: "sanctuary",
  },
  clockworkSentinel: {
    name: "Cronos",
    epithet: "O tempo gira a seu favor",
    color: "#b45309",
    model: model("clockworkSentinel"),
    ability: "timeWarp",
    playable: true,
    shieldColor: "#d97706",
    chair: "clockworkThrone",
    stage: "gearworks",
  },
  sentinelMech: {
    name: "Unidade Alva",
    epithet: "Alvo travado",
    color: "#e2e8f0",
    model: model("sentinelMech"),
    ability: "plasmaCannon",
    playable: true,
    shieldColor: "#e2e8f0",
    chair: "cyberThrone",
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

/** At most this many players share a local match. */
export const MAX_LOCAL_PLAYERS = 4;

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
 * character: the player id is their seat and character (`p2:crimsonWitch`), and a character
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
