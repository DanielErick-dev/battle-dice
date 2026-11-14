import { LocalGameClient } from "@/game/application/localGameClient";
import type { MatchRecording } from "@/game/application/replayGameClient";
import { createGame } from "@/game/domain/core/engine";
import type { PlayerId } from "@/game/domain/core/ids";
import type { BoardDefinition } from "@/game/domain/board/board";
import type { RosterEntry } from "@/features/characters";
import { MatchStore } from "./matchStore";
import { driveBots } from "./bots";

export interface LocalMatchOptions {
  /** Test mode: every ability starts charged. */
  chargedAbilities?: boolean;
  /** Dev only: pins the screen to this player, as an online seat would (see model/README.md). */
  seat?: PlayerId | null;
  /** Seats (0-based) the computer plays. */
  bots?: readonly number[];
}

export interface LocalMatch {
  store: MatchStore;
  /** Starts the computer players on their seats (LocalMatchOptions.bots); returns a stop. */
  startBots: () => () => void;
  /** The match so far, for watching it again (see model/replay.ts). */
  recording: () => MatchRecording;
}

/** Composition root for an offline match. A room match will swap in a network GameClient. */
export function createLocalMatch(
  board: BoardDefinition,
  roster: readonly RosterEntry[],
  { chargedAbilities = false, seat = null, bots = [] }: LocalMatchOptions = {},
): LocalMatch {
  // Offline the browser hosts the match, so it picks the seed; online the server will.
  const seed = Math.floor(Math.random() * 2 ** 32);
  const client = new LocalGameClient(createGame(board, roster, { seed, chargedAbilities }), undefined, seat);
  const store = new MatchStore(client);
  const botIds = bots.flatMap((index) => roster[index]?.id ?? []);
  store.computerSeats = botIds;
  return {
    store,
    recording: () => client.recording,
    startBots: () =>
      driveBots(
        store,
        () => client.current,
        (command) => client.send(command),
        botIds,
      ),
  };
}
