import type { GameEvent } from "@/game/domain/core/events";
import type { Player, PlayerId } from "@/game/domain/types";
import { turnLines } from "./turn";
import { tilesLines } from "./tiles";
import { cardsLines } from "./cards";
import { abilitiesLines } from "./abilities";
import { bjornLines } from "./bjorn";
import { kageLines } from "./kage";
import { fairyLines } from "./fairy";
import { seraphielLines } from "./seraphiel";
import { spectersLines } from "./specters";
import { sealsLines } from "./seals";
import { arrowRainLines } from "./arrowRain";
import { cardGambleLines } from "./cardGamble";
import { voidLines } from "./void";
import { verdictLines } from "./verdict";
import { akaneLines } from "./akane";
import { viniciusLines } from "./vinicius";
import { silentLines } from "./silent";
import type { LogLine, LogLines, LogTools } from "./lines";

export type { LogLine } from "./lines";

const LINES: LogLines<GameEvent["type"]> = {
  ...turnLines,
  ...tilesLines,
  ...cardsLines,
  ...abilitiesLines,
  ...bjornLines,
  ...kageLines,
  ...fairyLines,
  ...seraphielLines,
  ...spectersLines,
  ...sealsLines,
  ...arrowRainLines,
  ...cardGambleLines,
  ...voidLines,
  ...verdictLines,
  ...akaneLines,
  ...viniciusLines,
  ...silentLines,
};

/** What `event` reads like in the log, or null for those it leaves out (walks, draws, prompts). */
export function battleLogLine(event: GameEvent, players: readonly Player[]): LogLine | null {
  const who = (id: PlayerId): string => {
    const seat = players.findIndex((player) => player.id === id);
    return seat < 0 ? "?" : `J${seat + 1} (${players[seat].name})`;
  };
  const line = (actor: PlayerId, text: string): LogLine => ({ actor, text });
  const write = LINES[event.type] as (event: GameEvent, tools: LogTools) => LogLine | null;
  return write(event, { who, line });
}
