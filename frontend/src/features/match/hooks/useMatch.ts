"use client";

import type { BoardDefinition } from "@/game/domain/board";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createLocalMatch } from "../model/createLocalMatch";
import type { MatchStore } from "../model/matchStore";
import type { MatchView } from "../model/matchView";

export interface UseMatchResult {
  store: MatchStore;
  view: MatchView;
}

/** One store per mount: remount (e.g. with a `key`) to start a match on another board. */
export function useMatch(board: BoardDefinition): UseMatchResult {
  const [store] = useState(() => createLocalMatch(board));

  useEffect(() => store.connect(), [store]);

  const view = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { store, view };
}
