"use client";

import type { BoardDefinition } from "@/game/domain/board/board";
import type { RosterEntry } from "@/features/characters";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createLocalMatch, type LocalMatchOptions } from "../model/createLocalMatch";
import type { MatchStore } from "../model/matchStore";
import type { MatchView } from "../model/matchView";

interface UseMatchResult {
  store: MatchStore;
  /** Null while the client is connecting. */
  view: MatchView | null;
}

/** One store per mount: remount (e.g. with a `key`) to start another match. */
export function useMatch(
  board: BoardDefinition,
  roster: readonly RosterEntry[],
  options?: LocalMatchOptions,
): UseMatchResult {
  const [store] = useState(() => createLocalMatch(board, roster, options));

  useEffect(() => {
    // A failed connect leaves the view null (still loading); the retry screen comes with the online client.
    store.open().catch(() => {});
    return store.close;
  }, [store]);

  const view = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { store, view };
}
