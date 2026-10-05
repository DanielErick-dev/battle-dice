export type EffectsQuality = "high" | "low";

export interface PlaybackTimings {
  diceRollMs: number;
  diceRevealMs: number;
  stepMs: number;
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
  /** A turn's outcome stays in view this long before play (and the camera) moves on to the next player. */
  turnHandoffMs: number;
}

export const DEFAULT_TIMINGS: PlaybackTimings = {
  diceRollMs: 1300,
  diceRevealMs: 250,
  stepMs: 520,
  effectWarmupMs: 450,
  effectTravelMs: 750,
  hiddenTrapRevealMs: 900,
  realmGateMs: 1500,
  noticeMs: 1300,
  castMs: 1100,
  drawRevealMs: 1500,
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
  turnHandoffMs: 700,
};
