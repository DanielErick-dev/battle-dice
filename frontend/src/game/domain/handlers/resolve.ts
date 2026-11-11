import type { GameCommand } from "../core/commands";
import { diceFrom, type DiceRoller } from "../core/dice";
import { randomStream } from "../core/random";
import type { GameState } from "../core/state";
import { COMMAND_HANDLERS } from "./index";
import type { GameDependencies, GameTransition } from "./types";

/** Runs the command's handler on the state's own random stream and stores the advanced stream back. */
export function resolveCommand(state: GameState, command: GameCommand, loadedDice?: DiceRoller): GameTransition {
  const stream = randomStream(state.rng);
  const handler = COMMAND_HANDLERS[command.type] as (
    state: GameState,
    command: GameCommand,
    deps: GameDependencies,
  ) => GameTransition;
  // Loaded dice are for tests only (testing/); the public applyCommand never passes them.
  const transition = handler(state, command, {
    random: stream.random,
    rollDice: loadedDice ?? diceFrom(stream.random),
  });
  return { ...transition, state: { ...transition.state, rng: stream.snapshot() } };
}
