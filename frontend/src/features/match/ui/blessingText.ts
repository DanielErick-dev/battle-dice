import { BLESSING_TURNS, SPRING_ENERGY, WINGS_BONUS } from "@/game/domain/blessings";
import type { TimedBlessing } from "@/game/domain/types";

/** Player-facing names of heaven's timed blessings (pt-BR) and what each does. */
export const BLESSING_TEXT: Readonly<Record<TimedBlessing, { name: string; effect: string }>> = {
  wings: { name: "Asas Celestiais", effect: `+${WINGS_BONUS} casas em cada rolagem` },
  halo: { name: "Auréola Sagrada", effect: "armadilhas e maldições não te atingem" },
  inspiration: { name: "Inspiração Divina", effect: "a habilidade carrega em dobro" },
  spring: { name: "Fonte de Luz", effect: `+${SPRING_ENERGY} de energia a cada rodada` },
};

/** How long a blessing lasts on a player: BLESSING_TURNS rounds unless `turns` says otherwise (Seraphiel's). */
export function blessingDuration(turns = BLESSING_TURNS): string {
  return `por ${turns} rodadas`;
}
