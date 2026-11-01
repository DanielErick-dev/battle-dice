export type DiceRoller = () => number;

export const DICE_SIDES = 6;

export const randomDice: DiceRoller = () => Math.floor(Math.random() * DICE_SIDES) + 1;

/** Deterministic roller for tests and replays. */
export function sequenceDice(values: readonly number[]): DiceRoller {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}
