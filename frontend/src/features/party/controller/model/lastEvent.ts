import type { Player } from "@/game/domain/types";
import type { LogEntry } from "@/features/match/model/matchView";
import { battleLogLine } from "@/features/match/ui/battleLog";

/** The latest battle-log line worth a glance (round dividers skipped); null before anything happened. */
export function lastEvent(log: readonly LogEntry[], players: readonly Player[]): { id: number; text: string } | null {
  for (let index = log.length - 1; index >= 0; index -= 1) {
    const entry = log[index];
    if (!entry) continue;
    const line = battleLogLine(entry.event, players);
    if (line && !line.divider) return { id: entry.id, text: line.text };
  }
  return null;
}
