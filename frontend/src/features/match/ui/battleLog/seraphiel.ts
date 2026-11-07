import { plural, type LogLines } from "./lines";

/** Seraphiel. */
export const seraphielLines: LogLines<"seraphFell" | "crownGained" | "heavenBarred" | "hellDragged"> = {
  seraphFell: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} pisou no inferno e virou o Anjo Caído`),
  crownGained: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} ganhou a ${event.crown === "infernal" ? "Coroa Infernal" : "Coroa Seráfica"}`,
    ),
  heavenBarred: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} foi acorrentado pelo céu por ${plural(event.rounds, "rodada", "rodadas")}`,
    ),
  hellDragged: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} arrastou ${who(event.targetId)} para o inferno`),
};
