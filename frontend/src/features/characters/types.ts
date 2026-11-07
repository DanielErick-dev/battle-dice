import type { AbilityId } from "@/game/domain/abilities/ability";
import type { CrownId } from "./accessories/HeadCrown";
import type { ChairId } from "./accessories/chairs";
import type { WingsId } from "./accessories/wingLooks";

/**
 * Animation clips of a character model, built by scripts/characters/build-characters.mjs.
 * Every model has idle and run. Optional: intro plays once on the menus as the character is
 * picked, then showcase loops to present them (idle stands in without it); cast plays once as
 * they use their ability; float loops while they levitate (idle stands in without it); land plays
 * dash plays once as they throw themselves into a lightning dash, land as they touch down out of it.
 * shove plays once as Bjorn shoves someone he trampled; knocked as anyone is sent flying
 * (every model borrows it from one, see SHARED_CLIPS in the build manifest); rest loops, seated on a
 * chair, while they've lost turns (shared the same way); hop plays once as the Crystal Fairy stops on
 * her own snow, before it carries her on. brake plays once as they come to a stop out of a run, slowing
 * to a walk, and sit as they settle onto their chair before rest. guard and scoff are Themis's: passing
 * her verdict she guards, points (her cast) at the one judged, and scoffs as it turns on them. strike and fume
 * are Akane's: he strikes the ground as his fire bursts out (Hot Blood, the Impetus) and stomps in a fury on a low roll.
 */
export type CharacterClip =
  | "idle"
  | "run"
  | "cast"
  | "intro"
  | "showcase"
  | "float"
  | "dash"
  | "land"
  | "shove"
  | "knocked"
  | "rest"
  | "hop"
  | "brake"
  | "sit"
  | "guard"
  | "scoff"
  | "strike"
  | "fume";

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
  /** Turned this far round (radians) while the cast clip plays: a throw made side-on still aims down the path. */
  castTurn?: number;
  /** Tint of their Arcane Shield bubble (cyan by default). */
  shieldColor?: string;
  /** Holds her sword in the right hand, always (see JusticeSword). */
  holdsSword?: boolean;
  /** His hoe: stood beside him on the menu (PlantedHoe), out in the match only to hoe a trap out (HeldHoe). */
  holdsHoe?: boolean;
  /** His fire, always: a live flame off each palm (see BodyFlames) and his clothes burning without burning up (ClothFire). */
  handFlame?: boolean;
  /** A prop made in code, held in the right hand in the moves that use it (see HeldVial). */
  handProp?: "vial";
  /** Carries her bow slung on her back, drawn for her ability (see BackBow). */
  bow?: boolean;
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
  /** Wears a crown on the head (see HeadCrown), and the one once fallen. */
  crown?: CrownId;
  fallenCrown?: CrownId;
  /** Seraphiel's chair once he has fallen. */
  fallenChair?: ChairId;
  /** Their own chair to sit on while they've lost turns (see RestChair); a plain wooden one without. */
  chair?: ChairId;
  /**
   * Their own way of sitting (a sit clip), not the shared rest: the chair is scaled to meet their hips
   * and turned (radians) to the way they end up facing.
   */
  seat?: { scale: number; turn: number };
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
  /** She plants her sword in the ground through the intro and calls it back to her hand (see ThemisIntro). */
  introSword?: IntroSwordBeats;
  /** A line they say through their intro on the menu stage, `seconds` into it (a file in public/audio/voices/<character>/). */
  introVoice?: { src: string; seconds: number };
  /** Through the intro they write a sigil in the air that bursts into four scrolls (see ScribeIntro). */
  introSeals?: IntroSealBeats;
  /** Bones and skulls rise from the ground round them through the intro (see BoneRise). */
  introBones?: IntroBoneBeats;
  /** Frost gathers on their fist and the floor freezes over where it slams down in the intro (see FrostSlam). */
  introFrost?: IntroFrostBeats;
  /** Their intro gets up off their own chair, which bursts into flames at the snap of their fingers (see ThroneIntro). */
  /** Their intro gets up off a school chair that burns away as they rise, then snaps their fingers (see ChairIntro). */
  introChair?: { riseSeconds: number; snapSeconds: number };
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

/** Beats of Themis's intro (see ThemisIntro). */
export interface IntroSwordBeats {
  /** Seconds into the intro clip when the sword strikes the ground and stays planted there. */
  plantSeconds: number;
  /** When it starts to tremble, called back by her gestures. */
  trembleSeconds: number;
  /** When it tears itself out of the ground. */
  riseSeconds: number;
  /** When it lands back in her fist. */
  catchSeconds: number;
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

/** The stages a sheet can name; features/menu/stage/scenery draws each one. */
export type SceneryId =
  | "graveyard"
  | "scriptorium"
  | "tundra"
  | "sanctuary"
  | "voidRift"
  | "mistRuins"
  | "burningShrine"
  | "bloodRoseGarden"
  | "tribunal"
  | "sunkenTemple"
  | "gearworks"
  | "hangar"
  | "glade"
  | "grove"
  | "peak"
  | "temple"
  | "witchHollow"
  | "alchemyLab"
  | "cardTable"
  | "sakuraCourtyard"
  | "farmPlot";

export const model = (id: string) => `/models/characters/${id}.glb`;
