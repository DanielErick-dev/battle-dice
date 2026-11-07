import { plural, type LogLines } from "./lines";

/** The Archer. */
export const arrowRainLines: LogLines<"arrowsLoosed"> = {
  arrowsLoosed: (event, { who, line }) =>
    line(
      event.playerId,
      event.targets.length > 0
        ? `${who(event.playerId)} fez chover flechas sobre ${plural(event.targets.length, "casa", "casas")} de oponentes`
        : `${who(event.playerId)} cravou flechas em ${plural(event.pinned.length, "armadilha", "armadilhas")} à frente`,
    ),
};
