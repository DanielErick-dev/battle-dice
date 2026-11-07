import { cardText } from "../cards/cardText";
import { AIM_WARDS } from "./abilities";
import { plural, type LogLines } from "./lines";

/** Cards played, turned away or changed. */
export const cardsLines: LogLines<
  | "cardPlayed"
  | "cardBlocked"
  | "cardDiscarded"
  | "cardTeleported"
  | "cardsFused"
  | "cardTransmuted"
  | "cardsResurrected"
  | "energySacrificed"
> = {
  cardPlayed: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} jogou ${cardText(event.card.cardId, event.card.fused).name}${event.targetId ? ` em ${who(event.targetId)}` : ""}`,
    ),
  cardBlocked: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} jogou ${cardText(event.cardId).name} em ${who(event.targetId)}, mas não funcionou: ${AIM_WARDS[event.ward]}`,
    ),
  cardDiscarded: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} descartou ${cardText(event.card.cardId, event.card.fused).name}`),
  cardTeleported: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} se teletransportou para a casa ${event.to}`),
  cardsFused: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} fundiu cartas em ${cardText(event.card.cardId, true).name}`),
  cardTransmuted: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} transmutou ${cardText(event.from.cardId, event.from.fused).name} em ${cardText(event.to.cardId, event.to.fused).name}`,
    ),
  cardsResurrected: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} ressuscitou ${plural(event.cards.length, "carta", "cartas")}`),
  energySacrificed: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} sacrificou ${event.energy} de energia por uma carta`),
};
