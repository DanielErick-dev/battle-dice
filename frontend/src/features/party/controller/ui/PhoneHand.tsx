import { useState } from "react";
import type { CardTable } from "@/game/domain/cards/blocker";
import { CARD_CATALOG, cardCost, type CardId } from "@/game/domain/cards/catalog";
import type { CardChoice } from "@/game/domain/cards/choice";
import { FUSION_COPIES, fusibleInHand } from "@/game/domain/cards/fusion";
import { HAND_LIMIT, SACRIFICE_ENERGY } from "@/game/domain/cards/hand";
import { DICE_SIDES } from "@/game/domain/core/dice";
import type { CardInstance, Element, Player } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { playerColor } from "@/features/characters";
import {
  cardBlockReason,
  cardTargetsFor,
  exchangeElements,
  type CardPlayContext,
} from "@/features/match/ui/cards/cardBlockReason";
import { ELEMENT_NAME } from "@/features/match/ui/hud/effectCopy/tenzai";
import { CardChoicePicker } from "@/features/match/ui/cards/CardChoicePicker";
import { CardView } from "@/features/match/ui/cards/CardView";
import { CARD_TEXT, cardText } from "@/features/match/ui/cards/cardText";
import { Avatar } from "./Avatar";
import { PHONE } from "./phoneStyles";

interface PhoneHandProps {
  table: CardTable;
  player: Player;
  players: readonly Player[];
  canPlay: boolean;
  cardsLeft: number;
  lastDrawnUid: string | null;
  onPlay: (cardUid: string, choice: CardChoice) => void;
  /** Null when it isn't the player's moment (see CardHand). */
  onFuse: ((cardId: CardId) => void) | null;
  onSacrifice: (() => void) | null;
}

/** The hand as a grid of cards; a tap opens the card in a sheet with what playing it needs. */
export function PhoneHand({
  table,
  player,
  players,
  canPlay,
  cardsLeft,
  lastDrawnUid,
  onPlay,
  onFuse,
  onSacrifice,
}: PhoneHandProps) {
  const context: CardPlayContext = { table, player, players, canPlay, cardsLeft };
  const [openUid, setOpenUid] = useState<string | null>(null);
  /** A card that burns others, waiting for the cards to burn (its target already picked, if any). */
  const [burning, setBurning] = useState<{ card: CardInstance; targetId?: string } | null>(null);
  const open = player.hand.find((card) => card.uid === openUid) ?? null;
  const fusible = onFuse ? fusibleInHand(player.hand) : [];
  const canSacrifice =
    onSacrifice !== null &&
    player.energy >= SACRIFICE_ENERGY &&
    player.hand.length < HAND_LIMIT &&
    player.deck.length + player.discard.length > 0;

  const play = (card: CardInstance, choice: CardChoice = {}) => {
    setOpenUid(null);
    if (CARD_CATALOG[card.cardId].sacrifices && !choice.sacrificeUids) {
      setBurning({ card, targetId: choice.targetId });
      return;
    }
    setBurning(null);
    onPlay(card.uid, choice);
  };

  return (
    <section aria-label="Mão de cartas" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className={PHONE.label}>
          Mão {player.hand.length}/{HAND_LIMIT}
        </h2>
        <span className="text-[11px] text-zinc-500">Baralho: {player.deck.length}</span>
      </div>

      {fusible.map((cardId) => (
        <button
          key={cardId}
          type="button"
          onClick={() => onFuse?.(cardId)}
          className="min-h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-fuchsia-600 px-3 py-2 text-xs font-black tracking-wider text-white uppercase shadow-[0_0_16px_rgba(249,115,22,0.6)] active:scale-[0.98]"
        >
          Fundir {FUSION_COPIES}× {CARD_TEXT[cardId].name} → {cardText(cardId, true).name}
        </button>
      ))}
      {canSacrifice && (
        <button type="button" onClick={() => onSacrifice?.()} className={cn(PHONE.secondary, "text-amber-200")}>
          Sacrificar {SACRIFICE_ENERGY} de energia → 1 carta
        </button>
      )}

      {player.hand.length === 0 ? (
        <p className="hud-panel px-4 py-3 text-sm text-zinc-400">
          Sem cartas. Pare numa casa <span className="font-bold text-amber-300">Carta</span> para comprar.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {player.hand.map((card) => (
            <li
              key={card.uid}
              className={cn(card.uid === lastDrawnUid && "animate-in fade-in zoom-in-90 duration-500")}
            >
              <button
                type="button"
                onClick={() => setOpenUid(card.uid)}
                aria-label={cardText(card.cardId, card.fused).name}
                className="relative block w-full rounded-xl text-left"
              >
                <CardView
                  cardId={card.cardId}
                  fused={card.fused}
                  compact
                  dimmed={cardBlockReason(context, card) !== null}
                />
                {card.risen && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-teal-500 px-1.5 py-0.5 text-[8px] font-black tracking-wider whitespace-nowrap text-white uppercase">
                    Vira pó
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <CardSheet
          card={open}
          reason={cardBlockReason(context, open)}
          targets={cardTargetsFor(context, open)}
          elements={open.cardId === "elementalExchange" ? exchangeElements(context) : []}
          onPlay={(choice) => play(open, choice)}
          onClose={() => setOpenUid(null)}
        />
      )}

      {burning && (
        <div className="fixed inset-0 z-50 [&_ul.grid>li]:w-24">
          <CardChoicePicker
            title={cardText(burning.card.cardId, burning.card.fused).name}
            subtitle={
              CARD_CATALOG[burning.card.cardId].sacrifices === 1
                ? "Escolha a carta da mão que vai ser queimada para jogá-la."
                : `Escolha as ${CARD_CATALOG[burning.card.cardId].sacrifices} cartas da mão que vão ser queimadas para jogá-la.`
            }
            accent="amber"
            cards={player.hand.filter((held) => held.uid !== burning.card.uid)}
            max={CARD_CATALOG[burning.card.cardId].sacrifices ?? 1}
            required
            confirmLabel="Queimar e jogar"
            onPick={(sacrificeUids) => play(burning.card, { targetId: burning.targetId, sacrificeUids })}
            onCancel={() => setBurning(null)}
          />
        </div>
      )}
    </section>
  );
}

interface CardSheetProps {
  card: CardInstance;
  reason: string | null;
  targets: readonly Player[];
  /** The Elemental Exchange: what it may turn into. */
  elements: readonly Element[];
  onPlay: (choice: CardChoice) => void;
  onClose: () => void;
}

/** One card up close: its full text and what playing it asks (a die value, a target), or why it can't be played. */
function CardSheet({ card, reason, targets, elements, onPlay, onClose }: CardSheetProps) {
  const { needsValue, targetsOpponent } = CARD_CATALOG[card.cardId];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={cardText(card.cardId, card.fused).name}
      className="animate-in fade-in fixed inset-0 z-40 flex flex-col justify-end bg-black/70 backdrop-blur-sm duration-200"
      onClick={onClose}
    >
      <section
        onClick={(event) => event.stopPropagation()}
        className="hud-panel animate-in slide-in-from-bottom-8 mx-auto flex max-h-[92dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-b-none p-4 pb-[max(1rem,env(safe-area-inset-bottom))] duration-300"
      >
        <div className="mx-auto w-48">
          <CardView cardId={card.cardId} fused={card.fused} expanded />
        </div>

        {reason ? (
          <p className="rounded-xl bg-white/5 px-4 py-3 text-center text-sm font-semibold text-zinc-300">{reason}</p>
        ) : elements.length > 0 ? (
          <>
            <p className={cn(PHONE.label, "text-center")}>Vira qual elemento?</p>
            <div className="grid grid-cols-2 gap-2">
              {elements.map((element) => (
                <button key={element} type="button" onClick={() => onPlay({ element })} className={PHONE.primary}>
                  {ELEMENT_NAME[element]} dobrado
                </button>
              ))}
            </div>
          </>
        ) : needsValue ? (
          <>
            <p className={cn(PHONE.label, "text-center")}>Escolha o valor do dado</p>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: DICE_SIDES }, (_, index) => index + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onPlay({ value })}
                  className={cn(PHONE.primary, "text-2xl")}
                >
                  {value}
                </button>
              ))}
            </div>
          </>
        ) : targetsOpponent ? (
          <>
            <p className={cn(PHONE.label, "text-center")}>Escolha o alvo</p>
            <ul className="flex flex-col gap-2">
              {targets.map((target) => (
                <li key={target.id}>
                  <button type="button" onClick={() => onPlay({ targetId: target.id })} className={PHONE.row}>
                    <Avatar name={target.name} color={playerColor(target.id)} className="size-9 text-base" />
                    <span className="min-w-0 flex-1 truncate text-base font-black">{target.name}</span>
                    <span className="font-mono text-xs text-zinc-400">casa {target.position}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <button type="button" onClick={() => onPlay({})} className={PHONE.primary}>
            Usar · {cardCost(card.cardId)} de energia
          </button>
        )}

        <button type="button" onClick={onClose} className={PHONE.secondary}>
          Guardar
        </button>
      </section>
    </div>
  );
}
