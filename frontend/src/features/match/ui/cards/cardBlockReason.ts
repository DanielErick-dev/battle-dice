import { cardBlocker, type CardTable } from "@/game/domain/cards/blocker";
import { cardTargets } from "@/game/domain/cards/choice";
import { CARD_CATALOG, cardCost } from "@/game/domain/cards/catalog";
import type { CardInstance, Player } from "@/game/domain/types";

/** Everything that decides whether a card in hand can be played now (see CardHand). */
export interface CardPlayContext {
  table: CardTable;
  player: Player;
  /** Everyone in the match: who a card can be aimed at comes from them. */
  players: readonly Player[];
  canPlay: boolean;
  cardsLeft: number;
}

/** The opponents a card in hand can be aimed at (see cardTargets). */
export function cardTargetsFor({ table, player, players }: CardPlayContext, card: CardInstance): Player[] {
  return cardTargets(table.board, players, player.id, card.cardId);
}

/** Why a card can't be played right now, in words; null when it can. */
export function cardBlockReason(context: CardPlayContext, card: CardInstance): string | null {
  const { table, player, canPlay, cardsLeft } = context;
  if (cardsLeft === 0) return "Você já usou as cartas deste turno";
  if (!canPlay) return "Aguarde sua vez";
  switch (cardBlocker(table, player, card.cardId)) {
    case "SILENCED":
      return "Silenciado por um selo: sem cartas neste turno";
    case "NOT_ENOUGH_ENERGY":
      return `Energia insuficiente: precisa de ${cardCost(card.cardId)}, você tem ${player.energy}`;
    case "ALREADY_SHIELDED":
      return "O Escudo Arcano já está ativo";
    case "DICE_BOOST_ACTIVE":
      return "Já há uma carta de dado esperando a próxima rolagem";
    case "NO_PORTAL_AHEAD":
      return "Não há portal à frente";
    case "ENERGY_FULL":
      return "Sua energia já está no máximo";
    case "ABILITY_ALREADY_READY":
      return "Sua habilidade já está pronta";
    case "NO_HELL":
      return "Não há inferno neste tabuleiro";
    case "NOT_YOUR_CARD":
      return "Carta de outro personagem: só o dono pode usá-la";
    case "VOID_FULL":
      return "O Vazio já está cheio";
    case "VOID_EMPTY":
      return "O Vazio está vazio";
    case "NO_HARM_AHEAD":
      return "Nenhuma armadilha à vista à frente";
    case "NO_SACRIFICE":
      return "Precisa de outra carta na mão para queimar";
  }
  if (CARD_CATALOG[card.cardId].targetsOpponent && cardTargetsFor(context, card).length === 0) {
    if (card.cardId === "abyssCall") return "Ninguém fora do céu ou do inferno ao seu alcance";
    return card.cardId === "riftCall" ? "Nenhum oponente com uma fenda sua atrás dele" : "Sem oponentes";
  }
  return null;
}
