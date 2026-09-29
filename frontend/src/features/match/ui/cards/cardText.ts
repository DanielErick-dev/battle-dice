import type { CardId, Rarity } from "@/game/domain/cards";

/** Player-facing card copy (pt-BR). Rules live in the domain; this is only what the card says. */
export const CARD_TEXT: Readonly<Record<CardId, { name: string; description: string }>> = {
  windStep: { name: "Passo do Vento", description: "Avance 3 casas. A casa onde parar tem efeito." },
  healingHerb: { name: "Erva Curativa", description: "Recupere 4 de energia e cancele o “perde a vez”." },
  arcaneShield: { name: "Escudo Arcano", description: "A próxima armadilha não tem efeito sobre você." },
  ancientScroll: { name: "Pergaminho Antigo", description: "Compre 2 cartas do seu baralho." },
  luckyCharm: { name: "Amuleto da Sorte", description: "Some +2 à sua próxima rolagem." },
  berserkFury: { name: "Fúria Selvagem", description: "Na próxima rolagem, role 2 dados e some os dois." },
  oracleEye: { name: "Olho do Oráculo", description: "Na próxima rolagem, role 2 dados e fique com o maior." },
  arcaneBlast: { name: "Rajada Arcana", description: "Empurre um oponente 3 casas para trás." },
  blindingFlash: { name: "Clarão Ofuscante", description: "Um oponente perde a próxima vez." },
  mysticGate: { name: "Portal Místico", description: "Vá direto ao próximo portal e atravesse-o." },
  fateRune: { name: "Runa do Destino", description: "Escolha o valor da sua próxima rolagem." },
  ancestralAwakening: { name: "Despertar Ancestral", description: "Some +3 às suas próximas 2 rolagens." },
};

export const RARITY_LABEL: Readonly<Record<Rarity, string>> = { common: "Comum", rare: "Rara", epic: "Épica" };
