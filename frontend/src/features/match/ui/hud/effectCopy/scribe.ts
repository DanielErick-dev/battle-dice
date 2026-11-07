import { RUIN_PUSH, SOLO_RUIN_ADVANCE } from "@/game/domain/characters/scribe/seals";
import type { TileEffectView } from "../../../model/matchView";
import type { Copy, CopyEntries } from "./types";

/** The seal that broke: its name, and what it did (or, alone on the board, what it gave). */
function sealCopy({ seal, playerId }: TileEffectView): Copy {
  const own = seal?.owner === playerId;
  const energy = (amount: number) => (amount > 0 ? `+${amount} de energia` : "Energia já está no máximo");
  switch (seal?.kind) {
    case "tithe":
      return {
        title: "SELO DO DÍZIMO!",
        tone: "text-amber-300",
        subtitle: (_, name) => (own ? "Uma carta a mais na mão" : `${name} entrega a melhor carta`),
      };
    case "ruin":
      return {
        title: "SELO DA RUÍNA!",
        tone: "text-red-500",
        subtitle: (_, name) =>
          own ? `Os selos te levam ${SOLO_RUIN_ADVANCE} casas adiante` : `${name} volta ${RUIN_PUSH} casas`,
      };
    case "silence":
      return {
        title: "SELO DO SILÊNCIO!",
        tone: "text-slate-200",
        subtitle: (_, name) => (own ? energy(seal.energyGained) : `${name} não joga cartas no próximo turno`),
      };
    case "bloodPact":
    default:
      return {
        title: "PACTO DE SANGUE!",
        tone: "text-rose-500",
        subtitle: (_, name) =>
          own ? energy(seal?.energyGained ?? 0) : `${name} perde ${seal?.energyLost ?? 0} de energia para o Escriba`,
      };
  }
}

/** The Scribe's seals. */
export const scribeCopy = {
  seal: sealCopy,
} satisfies CopyEntries;
