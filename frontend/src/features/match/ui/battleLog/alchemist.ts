import type { InvertedOutcome } from "@/game/domain/characters/alchemist/types";
import { cardText } from "../cards/cardText";
import { plural, type LogLines } from "./lines";

const OUTCOME_LINE: Readonly<Record<InvertedOutcome, (amount: number) => string>> = {
  advance: (amount) => `avançou ${plural(amount, "casa", "casas")}`,
  pushBack: (amount) => `recuou ${plural(amount, "casa", "casas")}`,
  extraTurns: (amount) => `ganhou ${plural(amount, "jogada extra", "jogadas extras")}`,
  loseTurn: () => "perdeu a vez",
  draw: () => "comprou uma carta",
  discard: () => "perdeu uma carta",
  energy: (amount) => `ganhou ${amount} de energia`,
  drain: () => "teve a energia drenada",
  heaven: () => "foi para o céu",
  hell: () => "foi para o inferno",
  resisted: () => "estava protegido e nada aconteceu",
};

/** The Alchemist; her Condenser filling up stays out of the log (the HUD shows it). */
export const alchemistLines: LogLines<
  | "inversionStarted"
  | "inversionEnded"
  | "tileInverted"
  | "condenserFed"
  | "graveyardOpened"
  | "graveyardRaided"
  | "magnumOpus"
> = {
  inversionStarted: (event, { who, line }) =>
    line(
      event.playerId,
      `⚗️ ${who(event.playerId)} inverteu o tabuleiro por ${plural(event.turns, "rodada", "rodadas")}`,
    ),
  inversionEnded: (event, { line }) => line(event.playerId, "⚗️ A Grande Inversão acabou"),
  tileInverted: (event, { who, line }) =>
    line(
      event.playerId,
      `⚗️ Casa ${event.tile} invertida: ${who(event.playerId)} ${OUTCOME_LINE[event.outcome](event.amount ?? 0)}`,
    ),
  condenserFed: () => null,
  graveyardOpened: (event, { who, line }) =>
    line(
      event.playerId,
      `⚗️ ${who(event.playerId)} abriu ${event.own ? "o próprio cemitério" : "os cemitérios"} para pegar ${plural(event.picks, "carta", "cartas")}`,
    ),
  graveyardRaided: (event, { who, line }) =>
    line(
      event.playerId,
      `⚗️ ${who(event.playerId)} pegou do cemitério: ${event.cards.map(({ card }) => cardText(card.cardId, card.fused).name).join(", ")}`,
    ),
  magnumOpus: (event, { who, line }) =>
    line(
      event.playerId,
      `⚗️ A Grande Obra de ${who(event.playerId)}: queimou ${plural(event.burnt.length, "carta", "cartas")} da mão e tirou a melhor de ${plural(event.taken.length, "oponente", "oponentes")}`,
    ),
};
