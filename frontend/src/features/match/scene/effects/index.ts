/**
 * Every effect drawn on a figure or on the board, in the order they mount (see README.md). A new
 * effect gets its own component in the file of whoever owns it, and one line below.
 */
import { AbilityFlash } from "./abilities";
import { Blaze, Burning, EmberFeet, FuelFire, HandFlame, InnerFlame, PitchFire, ScarletFlames } from "./akane";
import { PinnedTraps, SlungBow, Volley } from "./arrowRain";
import { KnockedBurst, ShoveImpact, UntamedAura } from "./bjorn";
import { ArcaneBlastFx, DiceOrb, HealingHerbFx, PoweredAura, RedAura, ShieldFx, WindStepFx } from "./cards";
import { Tide } from "./cleansingTide";
import { DashBolt, DashLanding, FuryField, LimbBolts } from "./dormantFury";
import { EnchantedTiles, EternalWinter, FrostWandProp, Snowbound, SnowHop, SnowStream } from "./fairy";
import { ArmourShell, BlackFlames, SusanooArmour } from "./kage";
import { LevitationCast, LevitationGlow, LevitationStaff } from "./levitation";
import { Seals } from "./seals";
import { Fall, HeavenChains, HellsDrag } from "./seraphiel";
import { Apparitions } from "./specters";
import { Gate, HiddenTrap } from "./tiles";
import { HandVial, VialThrow } from "./transmutation";
import { HeldSword, JusticeMark, Verdict } from "./verdict";
import { Hoe } from "./vinicius";
import { LightBlades, Rifts, SmashedTraps, TheVoid, VoidAtWork } from "./void";
import type { BoardEffect, FigureEffect, TokenEffect } from "./types";
import { BackWings, WornCrown } from "./wings";

export const TOKEN_EFFECTS: {
  /** Round the figure, scaled to its size and rising with it when it levitates. */
  aura: readonly TokenEffect[];
  /** At its feet, unscaled. */
  ground: readonly TokenEffect[];
  /** In the figure's own frame, turning with it; mounted before the model. */
  body: readonly TokenEffect[];
  /** Held by the model's bones. */
  figure: readonly FigureEffect[];
} = {
  aura: [
    PoweredAura,
    RedAura,
    Fall,
    UntamedAura,
    Snowbound,
    SnowHop,
    HeavenChains,
    ShoveImpact,
    KnockedBurst,
    DiceOrb,
    ShieldFx,
    ArmourShell,
    WindStepFx,
    HealingHerbFx,
    Burning,
    InnerFlame,
    FuelFire,
    EmberFeet,
    AbilityFlash,
  ],
  ground: [FuryField, DashLanding, LevitationGlow, LevitationCast, JusticeMark],
  body: [SusanooArmour, VialThrow],
  figure: [
    LightBlades,
    LimbBolts,
    LevitationStaff,
    HandVial,
    FrostWandProp,
    HeldSword,
    Hoe,
    HandFlame,
    PitchFire,
    BackWings,
    WornCrown,
    SlungBow,
  ],
};

/** On the board, mounted before the figures. */
export const BOARD_EFFECTS: readonly BoardEffect[] = [
  Gate,
  SmashedTraps,
  Rifts,
  VoidAtWork,
  TheVoid,
  PinnedTraps,
  EnchantedTiles,
  EternalWinter,
  BlackFlames,
  ScarletFlames,
  Apparitions,
  Seals,
  Volley,
  Tide,
  HellsDrag,
  Verdict,
  Blaze,
  SnowStream,
  DashBolt,
  HiddenTrap,
];

/** Mounted after the figures. */
export const OVERLAY_EFFECTS: readonly BoardEffect[] = [ArcaneBlastFx];

export type { BoardFx, TokenFx, TokenSignals } from "./types";
