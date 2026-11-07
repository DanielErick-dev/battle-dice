import { useState } from "react";
import type { MatchStore } from "../../model/matchStore";
import { canRoll, type MatchView } from "../../model/matchView";
import { PAUSES_PER_PLAYER, useHourglass } from "../hud/Hourglass";

/** The hourglass of each turn and the pauses each player may spend (see Hourglass). */
export function useMatchClock(store: MatchStore, view: MatchView, hourglass: boolean, ready: boolean) {
  /** Who stopped the match, while it's stopped; pauses each player has spent. */
  const [pausedBy, setPausedBy] = useState<string | null>(null);
  const [pausesUsed, setPausesUsed] = useState<Readonly<Record<string, number>>>({});
  const pausesLeft = (id: string) => PAUSES_PER_PLAYER - (pausesUsed[id] ?? 0);
  const clockRunning = hourglass && ready && pausedBy === null && canRoll(view);
  const seconds = useHourglass({
    enabled: hourglass,
    running: clockRunning,
    turnKey: `${view.turnCount}:${view.activePlayerId}`,
    onTimeout: store.forfeitTurn,
  });
  const pause = () => {
    const id = view.activePlayerId;
    if (pausesLeft(id) === 0) return;
    setPausesUsed((used) => ({ ...used, [id]: (used[id] ?? 0) + 1 }));
    setPausedBy(id);
  };
  const resume = () => setPausedBy(null);
  return { seconds, clockRunning, pausedBy, pausesLeft, pause, resume };
}
