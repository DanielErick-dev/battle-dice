import type { GameCommand } from "../core/commands";
import { abilityCommands } from "./abilityCommands";
import { cardCommands } from "./cardCommands";
import { turnCommands } from "./turnCommands";
import type { CommandHandlers } from "./types";

export const COMMAND_HANDLERS: CommandHandlers<GameCommand["type"]> = {
  ...turnCommands,
  ...cardCommands,
  ...abilityCommands,
};
