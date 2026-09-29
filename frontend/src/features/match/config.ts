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
  /** Each tile of a knock-back (Arcane Blast): faster than walking. */
  pushStepMs: number;
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
  pushStepMs: 200,
};
