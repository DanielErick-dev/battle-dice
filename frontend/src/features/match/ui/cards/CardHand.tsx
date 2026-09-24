"use client";

import { useState } from "react";
import { CARD_CATALOG, cardCost, HAND_LIMIT } from "@/game/domain/cards";
import { DICE_SIDES } from "@/game/domain/dice";
import type { CardInstance, Player } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { CardView } from "./CardView";
import { CARD_TEXT } from "./cardText";
import { KiMeter } from "./KiMeter";

interface CardHandProps {
  player: Player;
  opponents: readonly Player[];
  /** It's this player's moment to act and no card was played this turn. */
  canPlay: boolean;
  alreadyPlayed: boolean;
  lastDrawnUid: string | null;
  onPlay: (cardUid: string, choice: { targetId?: string; value?: number }) => void;
}

/**
 * The active player's hand, floating at the side of the arena. Selecting a card opens its
 * action: play it, or first pick a die value / an opponent when the card needs one.
 */
export function CardHand({ player, opponents, canPlay, alreadyPlayed, lastDrawnUid, onPlay }: CardHandProps) {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const selected = player.hand.find((card) => card.uid === selectedUid) ?? null;

  const blockedReason = (card: CardInstance): string | null => {
    if (alreadyPlayed) return "Uma carta por turno";
    if (!canPlay) return "Aguarde sua vez";
    if (player.ki < cardCost(card.cardId)) {
      return `Ki insuficiente: precisa de ${cardCost(card.cardId)}, você tem ${player.ki}`;
    }
    if (CARD_CATALOG[card.cardId].targetsOpponent && opponents.length === 0) return "Sem oponentes";
    return null;
  };

  const play = (card: CardInstance, choice: { targetId?: string; value?: number } = {}) => {
    setSelectedUid(null);
    onPlay(card.uid, choice);
  };

  return (
    <section aria-label="Mão de cartas" className="flex flex-col items-end gap-2">
      <div
        className="hud-panel flex items-center gap-3 px-3 py-2"
        title={`Você pode guardar até ${HAND_LIMIT} cartas. Use uma por turno, antes de rolar o dado.`}
      >
        <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
          Cartas {player.hand.length}/{HAND_LIMIT}
        </span>
        <KiMeter ki={player.ki} />
      </div>

      {player.hand.length === 0 && (
        <p className="hud-panel max-w-40 px-3 py-2 text-right text-[11px] text-zinc-400">
          Pare numa casa <span className="font-bold text-amber-300">Carta</span> para comprar.
        </p>
      )}

      <ul className="flex flex-col items-end">
        {player.hand.map((card, index) => {
          const reason = blockedReason(card);
          const isSelected = card.uid === selectedUid;
          return (
            <li
              key={card.uid}
              className={cn(
                "relative w-28 transition-all duration-300 sm:w-36",
                index > 0 && "-mt-16 sm:-mt-20",
                isSelected ? "z-20 -translate-x-6 scale-105" : "hover:z-10 hover:-translate-x-3",
                card.uid === lastDrawnUid && "animate-in slide-in-from-right-24 fade-in duration-500",
              )}
            >
              {/* Floating lives on its own element so it doesn't fight the hover/selection offsets. */}
              <div style={{ animation: `card-float 2.4s ease-in-out ${index * 0.4}s infinite alternate` }}>
                <button
                  type="button"
                  onClick={() => setSelectedUid(isSelected ? null : card.uid)}
                  aria-pressed={isSelected}
                  aria-label={CARD_TEXT[card.cardId].name}
                  className="block w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-orange-400"
                >
                  <CardView cardId={card.cardId} dimmed={reason !== null} selected={isSelected} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {selected && (
        <CardAction
          card={selected}
          reason={blockedReason(selected)}
          opponents={opponents}
          onPlay={(choice) => play(selected, choice)}
        />
      )}
    </section>
  );
}

interface CardActionProps {
  card: CardInstance;
  reason: string | null;
  opponents: readonly Player[];
  onPlay: (choice: { targetId?: string; value?: number }) => void;
}

/** What the selected card needs before it can be played. */
function CardAction({ card, reason, opponents, onPlay }: CardActionProps) {
  const definition = CARD_CATALOG[card.cardId];
  const button =
    "rounded-lg bg-orange-600 px-3 py-2 text-xs font-black tracking-wider text-white uppercase transition hover:bg-orange-500 active:scale-95";

  return (
    <div className="hud-panel animate-in fade-in slide-in-from-right-4 flex max-w-56 flex-col gap-2 p-3 duration-200">
      {reason ? (
        <p className="text-xs font-semibold text-zinc-300">{reason}</p>
      ) : definition.needsValue ? (
        <>
          <p className="text-[11px] font-bold tracking-wider text-zinc-300 uppercase">Escolha o valor</p>
          <div className="grid grid-cols-6 gap-1">
            {Array.from({ length: DICE_SIDES }, (_, i) => i + 1).map((value) => (
              <button key={value} type="button" onClick={() => onPlay({ value })} className={cn(button, "px-0")}>
                {value}
              </button>
            ))}
          </div>
        </>
      ) : definition.targetsOpponent ? (
        <>
          <p className="text-[11px] font-bold tracking-wider text-zinc-300 uppercase">Escolha o alvo</p>
          {opponents.map((opponent) => (
            <button key={opponent.id} type="button" onClick={() => onPlay({ targetId: opponent.id })} className={button}>
              {opponent.name}
            </button>
          ))}
        </>
      ) : (
        <button type="button" onClick={() => onPlay({})} className={button}>
          Usar · {cardCost(card.cardId)} ki
        </button>
      )}
    </div>
  );
}
