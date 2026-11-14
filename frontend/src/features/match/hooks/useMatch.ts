"use client";

import type { BoardDefinition } from "@/game/domain/board/board";
import type { RosterEntry } from "@/features/characters";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createLocalMatch, type LocalMatchOptions } from "../model/createLocalMatch";
import type { MatchStore } from "../model/matchStore";
import type { MatchView } from "../model/matchView";
import { startReplay, type Replay } from "../model/replay";

interface UseMatchResult {
  /** The live match, or the replay while one is showing. */
  store: MatchStore;
  /** Null while the client is connecting. */
  view: MatchView | null;
  replaying: boolean;
  /** Watches the match so far again from the start. */
  watchReplay: () => void;
  /** Back to the live match. */
  leaveReplay: () => void;
}

/** One store per mount: remount (e.g. with a `key`) to start another match. */
export function useMatch(
  board: BoardDefinition,
  roster: readonly RosterEntry[],
  options?: LocalMatchOptions,
): UseMatchResult {
  const [match] = useState(() => createLocalMatch(board, roster, options));
  const [replay, setReplay] = useState<Replay | null>(null);

  useEffect(() => {
    // A failed connect leaves the view null (still loading); the retry screen comes with the online client.
    match.store.open().catch(() => {});
    return match.store.close;
  }, [match]);
  useEffect(() => () => replay?.stop(), [replay]);
  useEffect(() => match.startBots(), [match]);

  const store = replay?.store ?? match.store;
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const watchReplay = useCallback(() => setReplay(startReplay(match.recording())), [match]);
  const leaveReplay = useCallback(() => setReplay(null), []);
  return { store, view, replaying: replay !== null, watchReplay, leaveReplay };
}
