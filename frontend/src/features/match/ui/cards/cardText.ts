import {
  FUSED_AEGIS_TURNS,
  FUSED_BLAST_PUSH,
  FUSED_HERB_CHARGE,
  FUSED_LUCKY_BONUS,
  FUSED_SCROLL_DRAWS,
  FUSED_SHIELD_ARMOUR,
  FUSED_WIND_STEP_TILES,
} from "@/game/domain/cards/fusion";
import { AEGIS_TURNS, ARCANE_BLAST_PUSH, HEALING_HERB_ENERGY } from "@/game/domain/cards/play";
import type { CardId, Rarity } from "@/game/domain/cards/catalog";
import { HUNGRY_RIFT_RANGE, VOID_HUNGER_CHARGE } from "@/game/domain/cards/exclusive";
import {
  CONFISCATED_CARDS,
  CONTAINED_DIE,
  DECREE_ROLLS,
  JUDGMENT_SPAN,
  JUSTICE_MARCH,
} from "@/game/domain/characters/themis/cards";

/** Player-facing card copy (pt-BR). Rules live in the domain; this is only what the card says. */
export const CARD_TEXT: Readonly<Record<CardId, { name: string; description: string }>> = {
  windStep: { name: "Passo do Vento", description: "Avance 3 casas. A casa onde parar tem efeito." },
  healingHerb: {
    name: "Erva Curativa",
    description: `Recupere ${HEALING_HERB_ENERGY} de energia e cancele o “perde a vez”.`,
  },
  arcaneShield: {
    name: "Escudo Arcano",
    description: "A próxima armadilha não tem efeito sobre você.",
  },
  ancientScroll: {
    name: "Pergaminho Antigo",
    description: "Compre 2 cartas do seu baralho.",
  },
  luckyCharm: {
    name: "Amuleto da Sorte",
    description: "Some +2 à sua próxima rolagem.",
  },
  berserkFury: {
    name: "Fúria Selvagem",
    description: "Na próxima rolagem, role 2 dados e some os dois.",
  },
  oracleEye: {
    name: "Olho do Oráculo",
    description: "Na próxima rolagem, role 2 dados e fique com o maior.",
  },
  arcaneBlast: {
    name: "Rajada Arcana",
    description: `Empurre um oponente ${ARCANE_BLAST_PUSH} casas para trás.`,
  },
  blindingFlash: {
    name: "Clarão Ofuscante",
    description: "Um oponente perde a próxima vez.",
  },
  mysticGate: {
    name: "Portal Místico",
    description: "Vá direto ao próximo portal e atravesse-o.",
  },
  fateRune: {
    name: "Runa do Destino",
    description: "Escolha o valor da sua próxima rolagem.",
  },
  ancestralAwakening: {
    name: "Despertar Ancestral",
    description: "Some +3 às suas próximas 2 rolagens.",
  },
  fateSwap: {
    name: "Troca de Destinos",
    description: "Troque de lugar com um oponente.",
  },
  abyssCall: {
    name: "Chamado do Abismo",
    description: "Arraste um oponente para o inferno: ele percorre todo o inferno e volta onde estava.",
  },
  celestialLight: {
    name: "Luz Celestial",
    description: "Sua energia enche até o máximo.",
  },
  heavenlyAegis: {
    name: "Égide Celestial",
    description: `Nada que os oponentes lancem em você funciona por ${AEGIS_TURNS} rodadas, nem o tempo do Cronos.`,
  },
  ascension: { name: "Ascensão", description: "Sua habilidade fica pronta na hora." },

  blindJustice: {
    name: "Justiça Cega",
    description: `Todos os jogadores andam ${JUSTICE_MARCH} casas, um depois do outro, sem dado. A casa onde cada um parar tem efeito.`,
  },
  confiscation: {
    name: "Confisco de Bens",
    description: `Pegue ${CONFISCATED_CARDS} cartas aleatórias da mão de um oponente para a sua.`,
  },
  justiceMark: {
    name: "Marca da Justiça",
    description: "Todos os oponentes recebem a Marca da Justiça: o próximo ataque deles pode cair no seu Veredito.",
  },
  containmentDecree: {
    name: "Decreto de Contenção",
    description: `Nas próximas ${DECREE_ROLLS} rolagens de cada oponente, o dado não passa de ${CONTAINED_DIE}.`,
  },
  finalJudgment: {
    name: "Julgamento Final",
    description: `Triunfo. Queime outra carta da mão. Escolha um oponente: você anda (distância entre vocês ÷ ${JUDGMENT_SPAN}, para cima) × um Dado da Justiça. Ele fica onde está.`,
  },
  voidHunger: { name: "Fome do Vazio", description: `O Vazio ganha +${VOID_HUNGER_CHARGE} de carga.` },
  hungryRift: {
    name: "Fenda Faminta",
    description: `O Vazio engole a primeira armadilha, maldição ou “perde a vez” nas próximas ${HUNGRY_RIFT_RANGE} casas, sem gastar a carga.`,
  },
  voidEcho: { name: "Eco do Vazio", description: "A última coisa guardada no Vazio vira duas." },
  riftCall: {
    name: "Chamado da Fenda",
    description: "Puxe um oponente de volta até a sua fenda mais próxima atrás dele. Ela o atinge.",
  },
};

export const RARITY_LABEL: Readonly<Record<Rarity, string>> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Rara",
  epic: "Épica",
  legendary: "Lendária",
};

/** What a relic's footer says in place of its rarity. */
export const RELIC_LABEL = "Divina · Caminho Celestial";
export const FUSED_LABEL = "Fundida · 3 em 1";
/** Added to a character's own card's rarity. */
export const EXCLUSIVE_LABEL = "Exclusiva";

/** What a fused card is called and says instead (see fusion.ts); only the cards that fuse. */
export const FUSED_TEXT: Readonly<Partial<Record<CardId, { name: string; description: string }>>> = {
  windStep: {
    name: "Vendaval",
    description: `Avance ${FUSED_WIND_STEP_TILES} casas. A casa onde parar tem efeito.`,
  },
  healingHerb: {
    name: "Elixir da Vida",
    description: `Sua energia enche até o máximo, a habilidade carrega +${FUSED_HERB_CHARGE} e cancela o “perde a vez”.`,
  },
  luckyCharm: {
    name: "Trevo Dourado",
    description: `Some +${FUSED_LUCKY_BONUS} à sua próxima rolagem.`,
  },
  arcaneShield: {
    name: "Égide Arcana",
    description: `Escudo Arcano e, por ${FUSED_SHIELD_ARMOUR} rodadas, nada que os oponentes lancem em você funciona.`,
  },
  ancientScroll: {
    name: "Grimório Proibido",
    description: `Compre ${FUSED_SCROLL_DRAWS} cartas do seu baralho.`,
  },
  arcaneBlast: {
    name: "Tempestade Arcana",
    description: `Empurre um oponente ${FUSED_BLAST_PUSH} casas para trás.`,
  },
  celestialLight: {
    name: "Aurora Divina",
    description: "Energia cheia, habilidade pronta, e você se livra do “perde a vez” e da neve.",
  },
  heavenlyAegis: {
    name: "Santuário Celestial",
    description: `Escudo Arcano e, por ${FUSED_AEGIS_TURNS} rodadas, nada que os oponentes lancem funciona, nem o tempo.`,
  },
  ascension: {
    name: "Apoteose",
    description: "Sua habilidade fica pronta na hora, e você joga de novo depois deste turno.",
  },
};

/** The words on a card: its fused form's when it's fused. */
export function cardText(cardId: CardId, fused = false): { name: string; description: string } {
  return (fused && FUSED_TEXT[cardId]) || CARD_TEXT[cardId];
}
