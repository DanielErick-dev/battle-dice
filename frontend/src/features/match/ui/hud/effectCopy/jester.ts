import { CARD_GAMBLE_JACKPOT } from "@/game/domain/characters/jester/cardGamble";
import type { TileEffectView } from "../../../model/matchView";
import type { Copy, CopyEntries } from "./types";

/** Card Gamble's verdict: what the die of fortune showed, and which way it went. */
function gambleCopy({ gamble }: TileEffectView): Copy {
  const value = gamble?.value ?? 0;
  if (gamble?.fortune) {
    return {
      title: "LANCE DA SORTE!",
      tone: "text-amber-300",
      subtitle: () => `Tirou ${value}: +${value} ${value === 1 ? "carta" : "cartas"} na mão`,
    };
  }
  if (value >= CARD_GAMBLE_JACKPOT) {
    return { title: "JACKPOT!", tone: "text-fuchsia-300", subtitle: () => `Tirou ${value}: atrás das cartas épicas!` };
  }
  return gamble?.won
    ? { title: "SORTE GRANDE!", tone: "text-amber-300", subtitle: () => `Tirou ${value}: a sorte sorriu` }
    : { title: "AZAR!", tone: "text-rose-400", subtitle: () => `Tirou ${value}: perdeu uma carta` };
}

/** The Jester's Card Gamble. */
export const jesterCopy = {
  gamble: gambleCopy,
} satisfies CopyEntries;
