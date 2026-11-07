import { SPECTER_TEXT } from "../placementText";
import { plural, type LogLines } from "./lines";

/** The Warden's apparitions. */
export const spectersLines: LogLines<"spectersSummoned" | "specterStruck" | "spectersDispelled"> = {
  spectersSummoned: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} invocou ${plural(event.tiles.length, "aparição", "aparições")}`),
  specterStruck: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} esbarrou na ${SPECTER_TEXT[event.kind].name} de ${who(event.owner)}${event.energyTaken > 0 ? ` e perdeu ${event.energyTaken} de energia` : ""}`,
    ),
  spectersDispelled: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} desfez as aparições de ${who(event.owner)}`),
};
