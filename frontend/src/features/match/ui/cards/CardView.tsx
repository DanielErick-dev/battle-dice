import type { PointerEvent } from "react";
import { CARD_CATALOG, cardCost, RARITY_LEVEL, type CardId } from "@/game/domain/cards/catalog";
import { cn } from "@/lib/utils";
import { CARD_PALETTE, CardArt } from "./CardArt";
import { cardText, EXCLUSIVE_LABEL, FUSED_LABEL, RARITY_LABEL, RELIC_LABEL } from "./cardText";

/** The most orbs a card's cost is drawn with; a dearer card shows its number instead. */
const MAX_COST_ORBS = 4;

interface CardViewProps {
  cardId: CardId;
  /** Three copies fused into one: its fused name and rules, in a fiery frame. */
  fused?: boolean;
  /** Greyed out (not enough energy, card already played…). */
  dimmed?: boolean;
  selected?: boolean;
  /** In focus: the whole rules text showing, growing taller than the card only if the text needs it. */
  expanded?: boolean;
  /** Small tile (phone hand): name, cost and art only; the rules text lives in the opened card. */
  compact?: boolean;
  className?: string;
}

/** Every card above common gets a holographic foil that follows the pointer. */
export function CardView({
  cardId,
  fused = false,
  dimmed = false,
  selected = false,
  expanded = false,
  compact = false,
  className,
}: CardViewProps) {
  const { rarity, relic, exclusive } = CARD_CATALOG[cardId];
  const stars = RARITY_LEVEL[rarity];
  const palette = CARD_PALETTE[cardId];
  const text = cardText(cardId, fused);

  return (
    <div
      data-rarity={fused ? "fused" : relic ? "divine" : rarity}
      onPointerMove={trackPointer}
      onPointerLeave={resetPointer}
      className={cn(
        "game-card relative flex w-full flex-col overflow-hidden rounded-xl p-[3px] select-none",
        // In focus an invisible 5:7 spacer shares the grid cell, so the card keeps its shape and only grows for long text.
        expanded
          ? // One column pinned to the card's width: a tall text would otherwise widen it past the frame.
            "grid grid-cols-1 before:col-start-1 before:row-start-1 before:aspect-[5/7] before:w-full before:content-['']"
          : "aspect-[5/7]",
        // Still readable and in colour: a card you can't play now is only toned down, not greyed into the dark.
        dimmed && "brightness-[0.85] saturate-[0.75]",
        selected && "ring-2 ring-orange-400 ring-offset-2 ring-offset-black/60",
        className,
      )}
    >
      <div
        className="relative col-start-1 row-start-1 flex flex-1 flex-col overflow-hidden rounded-[9px] bg-zinc-950"
        // The card's own colours glow through its body, so a hand isn't a row of black slabs.
        style={{ backgroundImage: `linear-gradient(170deg, ${palette.from}55, #09090b 70%)` }}
      >
        <header
          className={cn(
            "flex gap-1 px-2 pt-1.5",
            compact ? "flex-col-reverse items-start" : "items-start justify-between",
          )}
        >
          <span
            className={cn(
              "line-clamp-2 leading-tight font-black text-white uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
              // Always two lines tall on the phone: one-line names would lift their art out of line with the rest.
              compact && "flex min-h-[2.5em] items-end",
              // Long single words (Teletransporte) can't wrap, so they shrink instead.
              text.name.length > 12 ? "text-[9px] tracking-normal" : "text-[11px] tracking-wide",
            )}
          >
            {text.name}
          </span>
          <span
            className="mt-0.5 flex shrink-0 items-center gap-0.5"
            aria-label={`Custa ${cardCost(cardId)} de energia`}
          >
            {cardCost(cardId) > MAX_COST_ORBS ? (
              // A cost too long for a row of orbs (Troca de Destinos) is one orb and its number.
              <>
                <span className="text-[10px] leading-none font-black text-amber-200">{cardCost(cardId)}</span>
                <span className="energy-orb size-2.5 rounded-full" />
              </>
            ) : (
              Array.from({ length: cardCost(cardId) }, (_, i) => (
                <span key={i} className="energy-orb size-2.5 rounded-full" />
              ))
            )}
          </span>
        </header>

        <div
          // Never squeezed by a long rules text: the text shrinks instead.
          className="mx-1.5 mt-1 aspect-[10/7] shrink-0 overflow-hidden rounded-md border border-white/25 shadow-[inset_0_0_12px_rgba(0,0,0,0.35)]"
          style={{ background: `radial-gradient(circle at 50% 40%, ${palette.from}, ${palette.to})` }}
        >
          <CardArt cardId={cardId} />
        </div>

        <p
          className={cn(
            compact && "hidden",
            "mx-1.5 mt-1.5 min-h-0 flex-1 rounded-md bg-white/5 px-1.5 py-1 leading-snug font-medium text-zinc-200",
            expanded
              ? "text-[11px]"
              : cn(
                  "overflow-hidden",
                  text.description.length > 120
                    ? "text-[8px]"
                    : text.description.length > 90
                      ? "text-[9px]"
                      : "text-[10px]",
                ),
          )}
        >
          {text.description}
        </p>
        {compact && <div className="flex-1" />}
        <footer className="flex items-center justify-between gap-1 px-2 py-1 text-[8px] font-bold tracking-[0.2em] text-zinc-200 uppercase">
          <span className="truncate">
            {fused
              ? FUSED_LABEL
              : relic
                ? RELIC_LABEL
                : exclusive
                  ? `${RARITY_LABEL[rarity]} · ${EXCLUSIVE_LABEL}`
                  : RARITY_LABEL[rarity]}
          </span>
          <span className="shrink-0 tracking-normal text-amber-300" aria-label={`Nível ${stars} de raridade`}>
            {"★".repeat(stars)}
          </span>
        </footer>

        {(fused || rarity !== "common") && <div className="card-foil pointer-events-none absolute inset-0" />}
        {fused && (
          <span className="absolute top-[38%] right-2 rounded-full bg-gradient-to-br from-amber-300 to-fuchsia-600 px-1.5 py-0.5 text-[9px] font-black text-white shadow-[0_0_10px_rgba(251,146,60,0.9)]">
            ×3
          </span>
        )}
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
