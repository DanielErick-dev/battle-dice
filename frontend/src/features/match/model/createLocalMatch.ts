import { LocalGameClient } from "@/game/application/localGameClient";
import { randomDice } from "@/game/domain/dice";
import { createGame } from "@/game/domain/engine";
import type { BoardDefinition } from "@/game/domain/board";
import { MATCH_ROSTER } from "../config";
import { MatchStore } from "./matchStore";

/** Composition root for an offline match. A room match will swap in a network GameClient. */
export function createLocalMatch(board: BoardDefinition): MatchStore {
  const game = createGame(board, MATCH_ROSTER, { random: Math.random });
  return new MatchStore(new LocalGameClient(game, { rollDice: randomDice, random: Math.random }));
}
