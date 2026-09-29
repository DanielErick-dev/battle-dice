import { LocalGameClient } from "@/game/application/localGameClient";
import { randomDice } from "@/game/domain/dice";
import { createGame } from "@/game/domain/engine";
import type { BoardDefinition } from "@/game/domain/board";
import type { RosterEntry } from "../characters";
import { MatchStore } from "./matchStore";

/** Composition root for an offline match. A room match will swap in a network GameClient. */
export function createLocalMatch(board: BoardDefinition, roster: readonly RosterEntry[]): MatchStore {
  const game = createGame(board, roster, { random: Math.random });
  return new MatchStore(new LocalGameClient(game, { rollDice: randomDice, random: Math.random }));
}
