"use client";

import { useState, type ReactNode } from "react";
import { cardBlocker } from "@/game/domain/cardPlay";
import { CARD_CATALOG, cardCost, HAND_LIMIT } from "@/game/domain/cards";
import { DICE_SIDES } from "@/game/domain/dice";
import type { Board, CardInstance, Player } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { CardBack } from "./CardBack";
import { CardView } from "./CardView";
import { CARD_TEXT } from "./cardText";
import { EnergyMeter } from "./EnergyMeter";

interface CardHandProps {
  board: Board;
  player: Player;
  opponents: readonly Player[];
  /** It's this player's moment to act and they still have a card to play this turn. */
  canPlay: boolean;
  /** Cards the player may still play this turn (two on a Double Cast turn). */
  cardsLeft: number;
  lastDrawnUid: string | null;
  onPlay: (cardUid: string, choice: { targetId?: string; value?: number }) => void;
  /** Extra player status shown under the energy (the character's ability). */
  status?: ReactNode;
}

/**
 * The active player's hand, floating at the side of the arena. The first click pulls a card
 * out, the second plays it; a card that needs a die value or a target shows those choices
 * beside it instead, and a card that can't be played says why there.
 */
export function CardHand({
  board,
  player,
  opponents,
  canPlay,
  cardsLeft,
  lastDrawnUid,
  onPlay,
  status,
}: CardHandProps) {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const blockedReason = (card: CardInstance): string | null => {
    if (cardsLeft === 0) return "Você já usou as cartas deste turno";
    if (!canPlay) return "Aguarde sua vez";
    switch (cardBlocker(board, player, card.cardId)) {
      case "SILENCED":
        return "Silenciado por um selo: sem cartas neste turno";
      case "NOT_ENOUGH_ENERGY":
        return `Energia insuficiente: precisa de ${cardCost(card.cardId)}, você tem ${player.energy}`;
      case "ALREADY_SHIELDED":
        return "O Escudo Arcano já está ativo";
      case "DICE_BOOST_ACTIVE":
        return "Já há uma carta de dado esperando a próxima rolagem";
      case "NO_PORTAL_AHEAD":
        return "Não há portal à frente";
      case "ENERGY_FULL":
        return "Sua energia já está no máximo";
      case "ABILITY_ALREADY_READY":
        return "Sua habilidade já está pronta";
    }
    if (CARD_CATALOG[card.cardId].targetsOpponent && opponents.length === 0) return "Sem oponentes";
    return null;
  };

  const play = (card: CardInstance, choice: { targetId?: string; value?: number } = {}) => {
    setSelectedUid(null);
    onPlay(card.uid, choice);
  };

  const click = (card: CardInstance) => {
    if (card.uid !== selectedUid) {
      setSelectedUid(card.uid);
      return;
    }
    const { needsValue, targetsOpponent } = CARD_CATALOG[card.cardId];
    if (blockedReason(card) || needsValue || targetsOpponent) return;
    play(card);
  };

  return (
    <section aria-label="Mão de cartas" className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <DeckPile count={player.deck.length} />
        <div
          className="hud-panel flex flex-col items-end gap-1.5 px-3 py-2"
          title={`Você pode guardar até ${HAND_LIMIT} cartas. Use uma por turno, antes de rolar o dado.`}
        >
          <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
            Mão {player.hand.length}/{HAND_LIMIT}
          </span>
          <EnergyMeter energy={player.energy} />
          {status}
          {cardsLeft > 1 && canPlay && (
            <span className="text-[10px] font-black tracking-wider text-violet-200 uppercase">
              {cardsLeft} cartas neste turno
            </span>
          )}
        </div>
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
                // A fuller hand overlaps more so a full hand (eight) still fits on screen.
                index > 0 &&
                  (player.hand.length > 6
                    ? "-mt-28 sm:-mt-[9.6rem]"
                    : player.hand.length > 4
                      ? "-mt-24 sm:-mt-[8.5rem]"
                      : player.hand.length > 3
                        ? "-mt-24 sm:-mt-32"
                        : "-mt-16 sm:-mt-20"),
                isSelected ? "z-20 -translate-x-6 scale-105" : "hover:z-10 hover:-translate-x-3",
                card.uid === lastDrawnUid && "animate-in slide-in-from-right-24 fade-in duration-500",
              )}
            >
              {/* Floating lives on its own element so it doesn't fight the hover/selection offsets. */}
              <div style={{ animation: `card-float 2.4s ease-in-out ${index * 0.4}s infinite alternate` }}>
                <button
                  type="button"
                  onClick={() => click(card)}
                  aria-pressed={isSelected}
                  aria-label={isSelected ? `Usar ${CARD_TEXT[card.cardId].name}` : CARD_TEXT[card.cardId].name}
                  className="relative block w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-orange-400"
                >
                  <CardView cardId={card.cardId} dimmed={reason !== null} selected={isSelected} />
                  {/* Brought back by Resurrection: a ghostly teal glow, and a warning it won't come back again. */}
                  {card.risen && (
                    <span
                      title="Ressuscitada: vira pó quando sair da mão"
                      className="pointer-events-none absolute inset-0 rounded-xl shadow-[0_0_18px_4px_rgba(45,212,191,0.55)] ring-2 ring-teal-300/80"
                    >
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-teal-500 px-2 py-0.5 text-[9px] font-black tracking-wider whitespace-nowrap text-white uppercase shadow">
                        Vira pó
                      </span>
                    </span>
                  )}
                </button>
              </div>
              {isSelected && (
                <CardAction
                  card={card}
                  reason={reason}
                  opponents={opponents}
                  onPlay={(choice) => play(card, choice)}
                  onClose={() => setSelectedUid(null)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface CardActionProps {
  card: CardInstance;
  reason: string | null;
  opponents: readonly Player[];
  onPlay: (choice: { targetId?: string; value?: number }) => void;
  onClose: () => void;
}

/**
 * Beside the pulled-out card, where it stays in view: why it can't be played, the choice it
 * needs, or a reminder that a second click plays it.
 */
function CardAction({ card, reason, opponents, onPlay, onClose }: CardActionProps) {
  const definition = CARD_CATALOG[card.cardId];
  const button =
    "rounded-lg bg-orange-600 px-3 py-2 text-xs font-black tracking-wider text-white uppercase transition hover:bg-orange-500 active:scale-95";

  return (
    <div className="hud-panel animate-in fade-in slide-in-from-right-4 absolute top-6 right-full z-30 mr-3 flex w-52 flex-col gap-2 p-3 duration-200">
      <button
        type="button"
        onClick={onClose}
        aria-label="Guardar a carta"
        className="absolute top-1 right-2 text-sm text-zinc-500 hover:text-zinc-200"
      >
        ×
      </button>
      {reason ? (
        <p className="pr-3 text-xs font-semibold text-zinc-300">{reason}</p>
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
            <button
              key={opponent.id}
              type="button"
              onClick={() => onPlay({ targetId: opponent.id })}
              className={button}
            >
              {opponent.name}
            </button>
          ))}
        </>
      ) : (
        <>
          <p className="pr-3 text-[11px] text-zinc-300">Clique na carta de novo para usar, ou aqui:</p>
          <button type="button" onClick={() => onPlay({})} className={button}>
            Usar · {cardCost(card.cardId)} de energia
          </button>
        </>
      )}
    </div>
  );
}

/** The player's deck, face down, with how many cards are left to draw. */
function DeckPile({ count }: { count: number }) {
  const layers = Math.min(3, count);
  return (
    <div
      className="relative w-12 sm:w-14"
      title={`Baralho: ${count} cartas para comprar`}
      aria-label={`Baralho com ${count} cartas`}
    >
      {count === 0 ? (
        <div className="aspect-[5/7] w-full rounded-xl border-2 border-dashed border-white/20" />
      ) : (
        Array.from({ length: layers }, (_, i) => (
          // Stacked a little up and to the left, the top card drawn last.
          <div key={i} className={cn(i > 0 && "absolute inset-0")} style={{ translate: `${-i * 2}px ${-i * 2}px` }}>
            <CardBack className="shadow-lg" />
          </div>
        ))
      )}
      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-200 ring-1 ring-amber-300/40">
        {count}
      </span>
    </div>
  );
}
