import { plural, type LogLines } from "./lines";

/** Kage Rubra. */
export const kageLines: LogLines<"flamesLit" | "flamesScorched" | "susanooRepelled"> = {
  flamesLit: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} acendeu o fogo negro em ${plural(event.tiles.length, "casa", "casas")}`,
    ),
  flamesScorched: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} se queimou no fogo negro de ${who(event.owner)}${event.energyLost > 0 ? ` e perdeu ${event.energyLost} de energia` : ""}`,
    ),
  susanooRepelled: (event, { who, line }) =>
    line(event.by, `O Susanoo de ${who(event.by)} repeliu ${who(event.playerId)}`),
};
