import type { RandomSource } from "./random";

export type DiceRoller = () => number;

export const DICE_SIDES = 6;

/** A fair die drawing from the match's own random stream. */
export const diceFrom =
  (random: RandomSource): DiceRoller =>
  () =>
    Math.floor(random() * DICE_SIDES) + 1;
