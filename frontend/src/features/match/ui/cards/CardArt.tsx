import type { CardId } from "@/game/domain/cards/catalog";
import { ART } from "./art";

/** Background gradient behind each card's artwork. */
export const CARD_PALETTE: Readonly<Record<CardId, { from: string; to: string }>> = {
  windStep: { from: "#3b82f6", to: "#1e3a8a" },
  healingHerb: { from: "#16a34a", to: "#052e16" },
  arcaneShield: { from: "#0891b2", to: "#083344" },
  berserkFury: { from: "#dc2626", to: "#450a0a" },
  arcaneBlast: { from: "#2563eb", to: "#0b1540" },
  blindingFlash: { from: "#f59e0b", to: "#78350f" },
  mysticGate: { from: "#7c3aed", to: "#1e1b4b" },
  fateRune: { from: "#ea580c", to: "#431407" },
  ancientScroll: { from: "#a16207", to: "#292524" },
  luckyCharm: { from: "#22c55e", to: "#14532d" },
  oracleEye: { from: "#6d28d9", to: "#0f0a2e" },
  ancestralAwakening: { from: "#f59e0b", to: "#451a03" },
  fateSwap: { from: "#0d9488", to: "#1e1b4b" },
  abyssCall: { from: "#7f1d1d", to: "#09090b" },
  celestialLight: { from: "#fef9c3", to: "#ca8a04" },
  heavenlyAegis: { from: "#e0f2fe", to: "#0369a1" },
  ascension: { from: "#fae8ff", to: "#7e22ce" },
  blindJustice: { from: "#fde68a", to: "#78350f" },
  confiscation: { from: "#d6d3d1", to: "#292524" },
  justiceMark: { from: "#fbbf24", to: "#451a03" },
  containmentDecree: { from: "#a8a29e", to: "#1c1917" },
  finalJudgment: { from: "#fef3c7", to: "#92400e" },
  hotBlood: { from: "#ef4444", to: "#450a0a" },
  emberStep: { from: "#f97316", to: "#431407" },
  scarletFever: { from: "#dc2626", to: "#1c0505" },
  pureFuel: { from: "#f59e0b", to: "#7c2d12" },
  scarletSupernova: { from: "#fde68a", to: "#7f1d1d" },
  voidHunger: { from: "#4c1d95", to: "#000000" },
  hungryRift: { from: "#6d28d9", to: "#09090b" },
  voidEcho: { from: "#7c3aed", to: "#030712" },
  riftCall: { from: "#5b21b6", to: "#0a0a0a" },
};

/** Painted illustrations (public/cards/), shown instead of the drawn artwork; the rest are still drawn below. */
const CARD_IMAGES: Partial<Record<CardId, string>> = {
  blindJustice: "/cards/blindJustice.webp",
  confiscation: "/cards/confiscation.webp",
  justiceMark: "/cards/justiceMark.webp",
  containmentDecree: "/cards/containmentDecree.webp",
  finalJudgment: "/cards/finalJudgment.webp",
  hotBlood: "/cards/hotBlood.webp",
  emberStep: "/cards/emberStep.webp",
  scarletFever: "/cards/scarletFever.webp",
  pureFuel: "/cards/pureFuel.webp",
  scarletSupernova: "/cards/scarletSupernova.webp",
};

export function CardArt({ cardId }: { cardId: CardId }) {
  const image = CARD_IMAGES[cardId];
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element -- a tiny static file, not worth next/image's loader.
    return <img src={image} alt="" draggable={false} className="h-full w-full object-cover" aria-hidden />;
  }
  return (
    <svg viewBox="0 0 100 70" className="h-full w-full" aria-hidden>
      {ART[cardId]}
    </svg>
  );
}
