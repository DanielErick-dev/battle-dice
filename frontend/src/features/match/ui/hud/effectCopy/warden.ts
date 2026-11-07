import { PLUNDER_CARDS } from "@/game/domain/characters/warden/specters";
import type { TileEffectView } from "../../../model/matchView";
import type { Copy, CopyEntries } from "./types";

/** An apparition that struck (or, alone, paid out), or the Warden's apparitions dispelled. */
function specterCopy({ specter, playerId }: TileEffectView): Copy {
  const own = specter?.owner === playerId;
  if (!specter?.kind) {
    return {
      title: "APARIÇÕES DISSIPADAS!",
      tone: "text-sky-200",
      subtitle: (_, name) => `${name} passou pelo Guardião verdadeiro`,
    };
  }
  if (specter.kind === "plunder") {
    return {
      title: "PILHAGEM ESPECTRAL!",
      tone: "text-sky-300",
      subtitle: (_, name) =>
        own ? `+${PLUNDER_CARDS} cartas na mão` : `O Guardião escolhe ${PLUNDER_CARDS} cartas de ${name}`,
    };
  }
  return {
    title: "FOME ESPECTRAL!",
    tone: "text-indigo-300",
    subtitle: (_, name) =>
      own
        ? "Energia cheia"
        : `${name} perdeu ${specter.energyTaken} de energia${specter.chargeGained > 0 ? " · habilidade +1" : ""}`,
  };
}

/** The Warden's apparitions. */
export const wardenCopy = {
  specter: specterCopy,
} satisfies CopyEntries;
