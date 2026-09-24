import type { CardId, Rarity } from "@/game/domain/cards";

/** Player-facing card copy (pt-BR). Rules live in the domain; this is only what the card says. */
export const CARD_TEXT: Readonly<Record<CardId, { name: string; description: string }>> = {
  flyingNimbus: { name: "Nuvem Voadora", description: "Avance 3 casas. A casa onde parar tem efeito." },
  senzuBean: { name: "Semente dos Deuses", description: "Recupere 2 de ki e cancele o “perde a vez”." },
  kiBarrier: { name: "Barreira de Ki", description: "A próxima armadilha não tem efeito sobre você." },
  kaioken: { name: "Kaioken", description: "Na próxima rolagem, role 2 dados e some os dois." },
  kamehameha: { name: "Kamehameha", description: "Empurre um oponente 3 casas para trás." },
  solarFlare: { name: "Taiyoken", description: "Um oponente perde a próxima vez." },
  instantTransmission: { name: "Teletransporte", description: "Vá direto ao próximo portal e atravesse-o." },
  dragonBall: { name: "Esfera do Dragão", description: "Escolha o valor da sua próxima rolagem." },
};

export const RARITY_LABEL: Readonly<Record<Rarity, string>> = { common: "Comum", rare: "Rara", epic: "Épica" };
