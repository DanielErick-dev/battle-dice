"use client";

import type { BoardDefinition } from "@/game/domain/board";
import type { RosterEntry } from "../characters";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createLocalMatch, type LocalMatchOptions } from "../model/createLocalMatch";
import type { MatchStore } from "../model/matchStore";
import type { MatchView } from "../model/matchView";

export interface UseMatchResult {
  store: MatchStore;
  view: MatchView;
}

/** One store per mount: remount (e.g. with a `key`) to start another match. */
export function useMatch(
  board: BoardDefinition,
  roster: readonly RosterEntry[],
  options?: LocalMatchOptions,
): UseMatchResult {
  const [store] = useState(() => createLocalMatch(board, roster, options));

  useEffect(() => store.connect(), [store]);

  const view = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { store, view };
}
