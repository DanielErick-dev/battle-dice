import { plural, type LogLines } from "./lines";

/** Bjorn. */
export const bjornLines: LogLines<"untamedUnleashed" | "playerTrampled"> = {
  untamedUnleashed: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} ficou Indomável por ${plural(event.turns, "turno", "turnos")}`),
  playerTrampled: (event, { who, line }) =>
    line(
      event.by,
      `${who(event.by)} ${event.burning ? "passou em chamas por" : "atropelou"} ${who(event.playerId)} e o mandou ${plural(event.path.length, "casa", "casas")} para trás`,
    ),
};
