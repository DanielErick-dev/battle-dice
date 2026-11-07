import { plural, type LogLines } from "./lines";

/** The Jester. */
export const cardGambleLines: LogLines<"gambleRolled" | "cardsStolen"> = {
  gambleRolled: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} apostou ${event.fortune ? "na sorte" : "contra um oponente"}, tirou ${event.value} e ${event.won ? "ganhou" : "perdeu"}`,
    ),
  cardsStolen: (event, { who, line }) =>
    line(
      event.playerId,
      event.cards.length > 0
        ? `${who(event.playerId)} roubou ${plural(event.cards.length, "carta", "cartas")} de ${who(event.from)}`
        : `${who(event.playerId)} tentou roubar ${who(event.from)}, mas a mão estava vazia`,
    ),
};
