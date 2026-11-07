import { FLAME_PUSH, SUSANOO_PUSH } from "@/game/domain/characters/kage/flames";
import type { CopyEntries } from "./types";

/** Kage Rubra's black fire and Susanoo. */
export const kageCopy = {
  repelled: {
    title: "O SUSANOO NÃO DEIXA!",
    tone: "text-red-400",
    subtitle: ({ from, to }, name) =>
      `${name} foi arremessado ${SUSANOO_PUSH === 1 ? "1 casa" : `${SUSANOO_PUSH} casas`} para ${to > from ? "frente" : "trás"}`,
  },
  flames: {
    title: "CHAMAS ETERNAS!",
    tone: "text-red-500",
    subtitle: ({ flames }, name) => `${name} perde ${flames?.energyLost ?? 0} de energia e volta ${FLAME_PUSH} casas`,
  },
} satisfies CopyEntries;
