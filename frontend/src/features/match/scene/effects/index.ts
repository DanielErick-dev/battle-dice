/**
 * Every effect drawn on a figure or on the board, in the order they mount (see README.md). A new
 * effect gets its own component in the file of whoever owns it, and one line below.
 */
import { AbilityFlash } from "./abilities";
import { PinnedTraps, SlungBow, Volley } from "./arrowRain";
import { KnockedBurst, ShoveImpact, UntamedAura } from "./berserker";
import { ArcaneBlastFx, DiceOrb, HealingHerbFx, PoweredAura, RedAura, ShieldFx, WindStepFx } from "./cards";
import { Tide } from "./cleansingTide";
import { DashBolt, DashLanding, FuryField, LimbBolts } from "./dormantFury";
import { EnchantedTiles, EternalWinter, FrostWandProp, Snowbound, SnowHop, SnowStream } from "./fairy";
import { ArmourShell, BlackFlames, SusanooArmour } from "./kunoichi";
import { LevitationCast, LevitationGlow, LevitationStaff } from "./levitation";
import { Seals } from "./seals";
import { Fall, HeavenChains, HellsDrag } from "./seraph";
import { Apparitions } from "./specters";
import { Gate, HiddenTrap } from "./tiles";
import { HandVial, VialThrow } from "./transmutation";
import { HeldScale, Verdict } from "./verdict";
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
    AbilityFlash,
  ],
  ground: [FuryField, DashLanding, LevitationGlow, LevitationCast],
  body: [SusanooArmour, VialThrow],
  figure: [LightBlades, LimbBolts, LevitationStaff, HandVial, FrostWandProp, HeldScale, BackWings, WornCrown, SlungBow],
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
  Apparitions,
  Seals,
  Volley,
  Tide,
  HellsDrag,
  Verdict,
  SnowStream,
  DashBolt,
  HiddenTrap,
];

/** Mounted after the figures. */
export const OVERLAY_EFFECTS: readonly BoardEffect[] = [ArcaneBlastFx];

export type { BoardFx, TokenFx, TokenSignals } from "./types";
