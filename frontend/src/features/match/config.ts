export type EffectsQuality = "high" | "low";

export interface PlaybackTimings {
  diceRollMs: number;
  diceRevealMs: number;
  stepMs: number;
  /** The last tile of a walk: slowing from a run to a stop on it (see the brake clip). */
  arriveMs: number;
  effectWarmupMs: number;
  effectTravelMs: number;
  /** A hidden trap bursting out of its tile before the player is thrown back. */
  hiddenTrapRevealMs: number;
  /** A realm gate opening before the player is carried into the track. */
  realmGateMs: number;
  /** How long a notice without movement (extra turn, lost turn) stays up. */
  noticeMs: number;
  /** A card flying into the arena before its effect plays out. */
  castMs: number;
  /** A drawn card leaving the deck and flipping face up in the middle of the screen. */
  drawRevealMs: number;
  /** Three cards flying together and the fused one revealed (see FusionOverlay). */
  fusionMs: number;
  /** A drawn card sliding into the hand. */
  drawMs: number;
  /** A card changing into another in the middle of the screen (Transmutation). */
  transmuteMs: number;
  /** The Transmutation's cast: the vial taken out, thrown (2.3 s in), landing and bursting into smoke, before its card changes. */
  transmuteThrowMs: number;
  /** Each tile of a knock-back (Arcane Blast): faster than walking. */
  pushStepMs: number;
  /** Dormant Fury: the player crouches and throws themselves forward, crackling with lightning. */
  dashLaunchMs: number;
  /** Dormant Fury: lightning strikes the player, who vanishes into it, before the dash. */
  dashStrikeMs: number;
  /** Each tile of the lightning dash: a blur. */
  dashStepMs: number;
  /** Lightning strikes the tile the dash ends on and the player steps out of it. */
  dashArriveMs: number;
  /** Arrow Rain: the archer draws and aims at the sky before loosing. */
  arrowAimMs: number;
  /** Arrow Rain: the arrows fly up out of sight and rain down on their targets. */
  arrowVolleyMs: number;
  /** Arrow Rain: the arrows hit, before the opponents are knocked back. */
  arrowImpactMs: number;
  /** Cleansing Tide: the wave rises and rolls over the tiles ahead, before the spells there are gone. */
  tideMs: number;
  /** Untamed: the Berserker beats his chest and roars before play goes on. */
  untamedCastMs: number;
  /** The Crystal Fairy hops on her own snow (crouch, jump, landing) before it carries her on. */
  snowHopMs: number;
  /** Time bent on an opponent: the camera goes over to them and stays (halted, they sit down on their chair). */
  timeBentMs: number;
  /** A trample on someone seated on their chair: they get up before the Berserker shoves. */
  trampleRiseMs: number;
  /** A trample: the Berserker steps ahead of the one he ran into, turns on them and shoves, up to the blow. */
  trampleShoveMs: number;
  /** A trample: the one shoved flies back to where the knock-back leaves them. */
  trampleFlightMs: number;
  /** A trample: they've landed and the Berserker turns back to run on. */
  trampleRecoverMs: number;
  /** The Fall: Seraphiel's light turns to fire before play goes on. */
  fallMs: number;
  /** Hell's Drag: a red glow wells up around the Fallen Angel as he reaches out. */
  dragCastMs: number;
  /** Hell's Drag: the ground cracks under the victim and the hand rises and closes on them. */
  dragGrabMs: number;
  /** Hell's Drag: the hand sinks back with the victim, before they appear in hell. */
  dragSinkMs: number;
  /** Silent Verdict: the scale rises over the board and weighs, swinging. */
  verdictWeighMs: number;
  /** Silent Verdict: the scale drops on the attacker's side and judgment strikes them. */
  verdictTipMs: number;
  /** Fairy Bloom: she raises her wand and points it ahead before the snow flies. */
  frostAimMs: number;
  /** Fairy Bloom: the snow streams from her wand to one tile, and lands. */
  frostStreamMs: number;
  /** Zarek's Void surfaces as a rift on a tile and does its work there. */
  voidRiftMs: number;
  /** A turn's outcome stays in view this long before play (and the camera) moves on to the next player. */
  turnHandoffMs: number;
}

export const DEFAULT_TIMINGS: PlaybackTimings = {
  diceRollMs: 1300,
  diceRevealMs: 250,
  stepMs: 520,
  arriveMs: 1000,
  effectWarmupMs: 450,
  effectTravelMs: 750,
  hiddenTrapRevealMs: 900,
  realmGateMs: 1500,
  noticeMs: 1300,
  castMs: 1100,
  drawRevealMs: 1500,
  fusionMs: 2600,
  drawMs: 700,
  transmuteMs: 3600,
  transmuteThrowMs: 3400,
  pushStepMs: 200,
  // The old man's push-off: he crouches, then is flying forward 1.1 s into his dash clip.
  dashLaunchMs: 1100,
  dashStrikeMs: 550,
  dashStepMs: 45,
  dashArriveMs: 700,
  arrowAimMs: 700,
  arrowVolleyMs: 1500,
  arrowImpactMs: 450,
  tideMs: 2300,
  untamedCastMs: 2200,
  timeBentMs: 2800,
  snowHopMs: 2100,
  trampleRiseMs: 1200,
  trampleShoveMs: 750,
  trampleFlightMs: 1000,
  trampleRecoverMs: 400,
  turnHandoffMs: 700,
  fallMs: 2600,
  dragCastMs: 1400,
  dragGrabMs: 1500,
  dragSinkMs: 1100,
  verdictWeighMs: 1900,
  verdictTipMs: 1300,
  frostAimMs: 1500,
  frostStreamMs: 2300,
  voidRiftMs: 1800,
};
