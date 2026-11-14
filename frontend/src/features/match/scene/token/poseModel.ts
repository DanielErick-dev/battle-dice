import type { CharacterClip, CharacterDefinition, ClipLengths } from "@/features/characters";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import type { TokenSignals } from "../effects/types";
import type { MotionFrame } from "./motion";

/** Hell's Drag as the figure lives it, by the clock second each stage began. */
type Drag = { id: number; since: number; stage: "sinking" | "gone" | "emerging" };

/**
 * Clock seconds each act started at (null when not playing); the `last*` ids make each one play
 * once per signal.
 */
export interface TokenActs {
  dashStartedAt: number | null;
  landStartedAt: number | null;
  drag: Drag | null;
  lastCast: number | null;
  castStartedAt: number | null;
  lastShove: number | null;
  /** Waiting for Bjorn to reach his spot ahead of them. */
  shovePending: boolean;
  shoveStartedAt: number | null;
  lastKnocked: number | null;
  knockedStartedAt: number | null;
  lastHop: number | null;
  hopStartedAt: number | null;
  runLinger: number;
  lastVerdict: number | null;
  lastOutburst: number | null;
  /** Jumping a wall: when it took off, and whether it's still on the wall's tile. */
  vaultStartedAt: number | null;
  onWall: boolean;
  /** Sat into the lotus at this clock second (Tenzai's Convergence). */
  meditateStartedAt: number | null;
  /** Themis passing her verdict, with the clips of it her model has. */
  reaction: { startedAt: number; clips: readonly CharacterClip[] } | null;
  sitStartedAt: number | null;
}

/** What of the character's sheet shapes its acts. */
interface ActTraits {
  /** Uses the ability without moving: no cast clip, no leap. */
  castsStill: boolean;
  /** Without a cast clip, the ability is a leap with a full spin (not for prop or wand holders). */
  spinsToCast: boolean;
  landImpactSeconds: number;
  castImpactSeconds: number | null;
  castPropSeconds: number;
  castTurn: number;
}

export interface PoseInput {
  now: number;
  delta: number;
  signals: Pick<
    TokenSignals,
    | "isDashing"
    | "isFuryAwake"
    | "isResting"
    | "shove"
    | "knocked"
    | "hop"
    | "dragged"
    | "abilityCast"
    | "verdict"
    | "outburst"
    | "overWall"
    | "meditating"
    | "limping"
  >;
  levitating: boolean;
  traits: ActTraits;
  lengths: ClipLengths;
  /** The model has a rest clip (and so a chair to sit on). */
  canRest: boolean;
  motion: MotionFrame;
  /** The heading the motion left, turned here by the acts that face somewhere. */
  heading: number | null;
  /** Which way the path runs at the target tile. */
  path: Vec3;
  position: Vec3;
  /** Where the one their reaction answers stands. */
  faceToward: Vec3 | null;
}

export interface Pose {
  clip: CharacterClip;
  heading: number | null;
  /** Turned this far off the heading for now (a side-on cast), never stored in it. */
  turn: number;
  /** Taken by the lightning mid-dash: only the bolt shows. */
  hidden: boolean;
  /** Under the board, carried off by Hell's Drag. */
  gone: boolean;
  /** 0 on the board, 1 sunk under it. */
  sunk: number;
  /** Progress of the leap-and-spin standing in for a cast clip (0 when not leaping). */
  spin: number;
  /** How far forward the lunge standing in for a shove clip has thrown the figure. */
  lunge: number;
  /** How far back a figure sent flying without a knocked clip reels (0–1). */
  reel: number;
  seated: boolean;
  crackling: boolean;
  bladesOut: boolean;
  propHeld: boolean;
  wandOut: boolean;
  /** Set on the frame each act starts, so its burst fires once and outlives the signal. */
  landingAt: number | null;
  shoveAt: number | null;
  hopBurst: number | null;
}

export function createTokenActs(): TokenActs {
  return {
    dashStartedAt: null,
    landStartedAt: null,
    drag: null,
    lastCast: null,
    castStartedAt: null,
    lastShove: null,
    shovePending: false,
    shoveStartedAt: null,
    lastKnocked: null,
    knockedStartedAt: null,
    lastHop: null,
    hopStartedAt: null,
    runLinger: 0,
    vaultStartedAt: null,
    onWall: false,
    meditateStartedAt: null,
    lastVerdict: null,
    lastOutburst: null,
    reaction: null,
    sitStartedAt: null,
  };
}

type TraitSheet = Pick<
  CharacterDefinition,
  "castsStill" | "handProp" | "wand" | "landImpactSeconds" | "castImpactSeconds" | "castPropSeconds" | "castTurn"
>;

export function actTraits(character: TraitSheet | null): ActTraits {
  const castsStill = character?.castsStill ?? false;
  return {
    castsStill,
    spinsToCast: !character?.handProp && !(character?.wand ?? false) && !castsStill,
    landImpactSeconds: character?.landImpactSeconds ?? 0,
    castImpactSeconds: character?.castImpactSeconds ?? null,
    castPropSeconds: character?.castPropSeconds ?? 0,
    castTurn: character?.castTurn ?? 0,
  };
}
