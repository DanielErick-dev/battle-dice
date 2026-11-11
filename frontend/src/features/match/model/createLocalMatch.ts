import { LocalGameClient } from "@/game/application/localGameClient";
import { createGame } from "@/game/domain/core/engine";
import type { PlayerId } from "@/game/domain/core/ids";
import type { BoardDefinition } from "@/game/domain/board/board";
import type { RosterEntry } from "@/features/characters";
import { MatchStore } from "./matchStore";

export interface LocalMatchOptions {
  /** Test mode: every ability starts charged. */
  chargedAbilities?: boolean;
  /** Dev only: pins the screen to this player, as an online seat would (see model/README.md). */
  seat?: PlayerId | null;
}

/** Composition root for an offline match. A room match will swap in a network GameClient. */
export function createLocalMatch(
  board: BoardDefinition,
  roster: readonly RosterEntry[],
  { chargedAbilities = false, seat = null }: LocalMatchOptions = {},
): MatchStore {
  // Offline the browser hosts the match, so it picks the seed; online the server will.
  const seed = Math.floor(Math.random() * 2 ** 32);
  return new MatchStore(new LocalGameClient(createGame(board, roster, { seed, chargedAbilities }), undefined, seat));
}
