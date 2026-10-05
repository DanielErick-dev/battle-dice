import { LocalGameClient } from "@/game/application/localGameClient";
import { randomDice } from "@/game/domain/dice";
import { abilityCycle } from "@/game/domain/abilities";
import { createGame } from "@/game/domain/engine";
import type { BoardDefinition } from "@/game/domain/board";
import type { RosterEntry } from "../characters";
import { MatchStore } from "./matchStore";

export interface LocalMatchOptions {
  /** Test mode: every ability starts charged. */
  chargedAbilities?: boolean;
}

/** Composition root for an offline match. A room match will swap in a network GameClient. */
export function createLocalMatch(
  board: BoardDefinition,
  roster: readonly RosterEntry[],
  { chargedAbilities = false }: LocalMatchOptions = {},
): MatchStore {
  const created = createGame(board, roster, { random: Math.random });
  const game = chargedAbilities
    ? {
        ...created,
        players: created.players.map((player) => ({ ...player, abilityCharge: abilityCycle(player.ability) })),
      }
    : created;
  return new MatchStore(new LocalGameClient(game, { rollDice: randomDice, random: Math.random }));
}
