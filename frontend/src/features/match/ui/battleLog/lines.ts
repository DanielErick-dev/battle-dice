import type { GameEvent } from "@/game/domain/core/events";
import type { PlayerId } from "@/game/domain/types";

/** One battle log line (pt-BR): `actor` colours it, `divider` marks a new turn. */
export interface LogLine {
  text: string;
  actor?: PlayerId;
  divider?: boolean;
}

export interface LogTools {
  /** A player by seat and character: "J2 (Bjorn)". */
  who: (id: PlayerId) => string;
  line: (actor: PlayerId, text: string) => LogLine;
}

/** How each event in `Types` reads in the log, or null for those it leaves out. */
export type LogLines<Types extends GameEvent["type"]> = {
  [Type in Types]: (event: Extract<GameEvent, { type: Type }>, tools: LogTools) => LogLine | null;
};

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
