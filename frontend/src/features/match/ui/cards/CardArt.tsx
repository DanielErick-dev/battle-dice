"use client";

import { useState } from "react";
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
  voidApex: { from: "#7c3aed", to: "#0a0a0a" },
  bloodTear: { from: "#b91c1c", to: "#0a0a0a" },
  scarletMirage: { from: "#9f1239", to: "#0c0a09" },
  amaterasuBreeze: { from: "#3f3f46", to: "#000000" },
  susanooSword: { from: "#e11d48", to: "#1e1b4b" },
  eternalEclipse: { from: "#dc2626", to: "#000000" },
  frostBreath: { from: "#a5f3fc", to: "#164e63" },
  slipperyTrack: { from: "#67e8f9", to: "#0c4a6e" },
  crystalWings: { from: "#e0f2fe", to: "#1e3a8a" },
  glacialHarvest: { from: "#7dd3fc", to: "#0f172a" },
  absoluteZero: { from: "#f0f9ff", to: "#082f49" },
  tectonicFortification: { from: "#a16207", to: "#1c1917" },
  riptideLash: { from: "#0284c7", to: "#082f49" },
  forcedTailwind: { from: "#34d399", to: "#022c22" },
  elementalExchange: { from: "#f97316", to: "#1e1b4b" },
  elementalConvergence: { from: "#67e8f9", to: "#0f172a" },
  catalyticStep: { from: "#10b981", to: "#052e16" },
  polarityContamination: { from: "#a855f7", to: "#1e1b4b" },
  graveyardRaider: { from: "#6ee7b7", to: "#18181b" },
  strictEquivalence: { from: "#8b5cf6", to: "#0f172a" },
  magnumOpus: { from: "#dc2626", to: "#1c1917" },
  malwareInjection: { from: "#65a30d", to: "#0f172a" },
  overloadThruster: { from: "#0284c7", to: "#0f172a" },
  firewallLock: { from: "#0369a1", to: "#082f49" },
  dataCollapse: { from: "#7c3aed", to: "#0f172a" },
  apocalypseProtocol: { from: "#b91c1c", to: "#0f172a" },
};

/** Painted illustrations (public/cards/); the drawn artwork stays as the fallback if one fails to load. */
const CARD_IMAGES: Partial<Record<CardId, string>> = {
  voidHunger: "/cards/voidHunger.webp",
  hungryRift: "/cards/hungryRift.webp",
  voidEcho: "/cards/voidEcho.webp",
  riftCall: "/cards/riftCall.webp",
  voidApex: "/cards/voidApex.webp",
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
  tectonicFortification: "/cards/tectonicFortification.webp",
  elementalExchange: "/cards/elementalExchange.webp",
  riptideLash: "/cards/riptideLash.webp",
  forcedTailwind: "/cards/forcedTailwind.webp",
  elementalConvergence: "/cards/elementalConvergence.webp",
  catalyticStep: "/cards/catalyticStep.webp",
  polarityContamination: "/cards/polarityContamination.webp",
  graveyardRaider: "/cards/graveyardRaider.webp",
  strictEquivalence: "/cards/strictEquivalence.webp",
  magnumOpus: "/cards/magnumOpus.webp",
  malwareInjection: "/cards/malwareInjection.webp",
  overloadThruster: "/cards/overloadThruster.webp",
  firewallLock: "/cards/firewallLock.webp",
  dataCollapse: "/cards/dataCollapse.webp",
  apocalypseProtocol: "/cards/apocalypseProtocol.webp",
  bloodTear: "/cards/bloodTear.webp",
  scarletMirage: "/cards/scarletMirage.webp",
  amaterasuBreeze: "/cards/amaterasuBreeze.webp",
  susanooSword: "/cards/susanooSword.webp",
  eternalEclipse: "/cards/eternalEclipse.webp",
};

/** The painted image to show, or null to draw the card (no image, or this one already failed to load). */
export function cardImage(cardId: CardId, failedSrc: string | null): string | null {
  const image = CARD_IMAGES[cardId];
  return image && image !== failedSrc ? image : null;
}

export function CardArt({ cardId }: { cardId: CardId }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const image = cardImage(cardId, failedSrc);
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a tiny static file, not worth next/image's loader.
      <img
        src={image}
        alt=""
        draggable={false}
        className="h-full w-full object-cover"
        aria-hidden
        onError={() => setFailedSrc(image)}
        // An image that failed before hydration never fires onError, so check it once mounted.
        ref={(el) => {
          if (el?.complete && el.naturalWidth === 0) setFailedSrc(image);
        }}
      />
    );
  }
  return <DrawnArt cardId={cardId} />;
}

/** The procedural SVG artwork, which every card has. */
export function DrawnArt({ cardId }: { cardId: CardId }) {
  return (
    <svg viewBox="0 0 100 70" className="h-full w-full" aria-hidden>
      {ART[cardId]}
    </svg>
  );
}
