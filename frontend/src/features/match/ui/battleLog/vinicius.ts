import type { LogLines } from "./lines";

export const viniciusLines: LogLines<"trapWeeded"> = {
  trapWeeded: (event, { who, line }) =>
    line(
      event.playerId,
      `🌱 ${who(event.playerId)} capinou ${event.hidden ? "uma armadilha escondida" : `a armadilha da casa ${event.tile}`}`,
    ),
};
