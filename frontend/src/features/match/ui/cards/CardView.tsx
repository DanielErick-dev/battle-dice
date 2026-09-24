import type { PointerEvent } from "react";
import { CARD_CATALOG, cardCost, type CardId } from "@/game/domain/cards";
import { cn } from "@/lib/utils";
import { CARD_PALETTE, CardArt } from "./CardArt";
import { CARD_TEXT, RARITY_LABEL } from "./cardText";

interface CardViewProps {
  cardId: CardId;
  /** Greyed out (not enough ki, card already played…). */
  dimmed?: boolean;
  selected?: boolean;
  className?: string;
}

/**
 * A card face: cost in ki orbs, artwork, name and rules text, framed by rarity. Rare and
 * epic cards get a holographic foil that follows the pointer (and tilts the card).
 */
export function CardView({ cardId, dimmed = false, selected = false, className }: CardViewProps) {
  const { rarity } = CARD_CATALOG[cardId];
  const palette = CARD_PALETTE[cardId];
  const text = CARD_TEXT[cardId];

  return (
    <div
      data-rarity={rarity}
      onPointerMove={trackPointer}
      onPointerLeave={resetPointer}
      className={cn(
        "game-card relative flex aspect-[5/7] w-full flex-col overflow-hidden rounded-xl p-[3px] select-none",
        dimmed && "saturate-[0.35] brightness-75",
        selected && "ring-2 ring-orange-400 ring-offset-2 ring-offset-black/60",
        className,
      )}
    >
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-[9px] bg-zinc-950">
        <header className="flex items-start justify-between gap-1 px-2 pt-1.5">
          <span
            className={cn(
              "line-clamp-2 leading-tight font-black text-white uppercase",
              // Long single words (Teletransporte) can't wrap, so they shrink instead.
              text.name.length > 12 ? "text-[9px] tracking-normal" : "text-[11px] tracking-wide",
            )}
          >
            {text.name}
          </span>
          <span className="mt-0.5 flex shrink-0 gap-0.5" aria-label={`Custa ${cardCost(cardId)} de ki`}>
            {Array.from({ length: cardCost(cardId) }, (_, i) => (
              <span key={i} className="ki-orb size-2.5 rounded-full" />
            ))}
          </span>
        </header>

        <div
          className="mx-1.5 mt-1 aspect-[10/7] overflow-hidden rounded-md border border-white/15"
          style={{ background: `radial-gradient(circle at 50% 40%, ${palette.from}, ${palette.to})` }}
        >
          <CardArt cardId={cardId} />
        </div>

        <p className="mx-1.5 mt-1.5 flex-1 rounded-md bg-white/5 px-1.5 py-1 text-[10px] leading-snug font-medium text-zinc-200">
          {text.description}
        </p>
        <footer className="px-2 py-1 text-[8px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
          {RARITY_LABEL[rarity]}
        </footer>

        {rarity !== "common" && <div className="card-foil pointer-events-none absolute inset-0" />}
        <div className="card-glare pointer-events-none absolute inset-0" />
      </div>
    </div>
  );
}

/** Feeds the pointer position (0–1) to the foil/tilt CSS through custom properties. */
function trackPointer(event: PointerEvent<HTMLDivElement>) {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  card.style.setProperty("--mx", String((event.clientX - rect.left) / rect.width));
  card.style.setProperty("--my", String((event.clientY - rect.top) / rect.height));
  card.dataset.hover = "on";
}

function resetPointer(event: PointerEvent<HTMLDivElement>) {
  const card = event.currentTarget;
  card.style.removeProperty("--mx");
  card.style.removeProperty("--my");
  delete card.dataset.hover;
}
