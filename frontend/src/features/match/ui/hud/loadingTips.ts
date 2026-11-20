import { HAND_LIMIT, SACRIFICE_ENERGY } from "@/game/domain/cards/hand";
import { CHARACTER_GUIDES } from "@/features/characters/guide";
import type { CharacterId } from "@/features/characters";
import { PAUSES_PER_PLAYER, TURN_SECONDS } from "@/features/shared/config";

/** Rules worth knowing whoever plays (pt-BR). */
export const GENERAL_TIPS: readonly string[] = [
  `Sem a carta certa? Troque ${SACRIFICE_ENERGY} de energia por 1 carta do baralho.`,
  `A mão guarda até ${HAND_LIMIT} cartas: além disso, alguma vai para o descarte.`,
  `Cada vez tem ${TURN_SECONDS} segundos na ampulheta, e cada jogador pode pausar ${PAUSES_PER_PLAYER} vezes.`,
  "Arraste o tabuleiro para olhar em volta; escolha Perto, Médio ou Tabuleiro e a câmera volta a seguir a jogada.",
  "Um oponente protegido ainda pode ser escolhido: a carta é gasta e aparece BLOQUEADO.",
  "Passar por cima de um feitiço de chão não faz nada: só parar nele.",
];

/** What the curtain shows while the match loads: tips for the characters playing, then the rules, shuffled by `seed`. */
export function loadingTips(characters: readonly CharacterId[], seed = 0): string[] {
  const own = [...new Set(characters)].flatMap((id) => CHARACTER_GUIDES[id]?.tips ?? []);
  const tips = [...own, ...GENERAL_TIPS];
  // A stable shuffle, so one load doesn't keep jumping between orders.
  return tips
    .map((tip, index) => ({ tip, order: Math.sin((index + 1) * 12.9898 + seed * 78.233) }))
    .sort((a, b) => a.order - b.order)
    .map(({ tip }) => tip);
}
