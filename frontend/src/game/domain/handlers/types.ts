import type { GameCommand } from "../core/commands";
import type { DiceRoller } from "../core/dice";
import type { GameEvent } from "../core/events";
import type { RandomSource } from "../core/random";
import type { GameState } from "../types";

export interface GameDependencies {
  rollDice: DiceRoller;
  /** Injected like the dice so games replay exactly. */
  random: RandomSource;
}

export interface GameTransition {
  state: GameState;
  events: GameEvent[];
}

export type CommandOf<K extends GameCommand["type"]> = Extract<GameCommand, { type: K }>;

/** The full map must name every GameCommand, so a new command doesn't compile until it has a handler. */
export type CommandHandlers<K extends GameCommand["type"]> = {
  [T in K]: (state: GameState, command: CommandOf<T>, deps: GameDependencies) => GameTransition;
};
