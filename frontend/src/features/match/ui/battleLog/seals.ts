import { SEAL_TEXT } from "../placementText";
import { plural, type LogLines } from "./lines";

/** The Scribe's seals. */
export const sealsLines: LogLines<"sealsWritten" | "sealBroken"> = {
  sealsWritten: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} escreveu ${plural(event.tiles.length, "selo", "selos")} proibidos`),
  sealBroken: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} rompeu o ${SEAL_TEXT[event.kind].name} de ${who(event.owner)}`),
};
