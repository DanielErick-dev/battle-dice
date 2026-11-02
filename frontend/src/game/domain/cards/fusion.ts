import type { CardId } from "./catalog";
import { GameRuleError } from "../core/errors";
import { playerIn, updatePlayer, type Draft } from "../core/draft";
import type { CardInstance, PlayerId } from "../core/state";

export const FUSION_COPIES = 3;

/** The everyday cards a deck holds several of, plus the relics; fused effects are in cardPlay.ts. */
export const FUSIBLE_CARDS: readonly CardId[] = [
  "windStep",
  "healingHerb",
  "luckyCharm",
  "arcaneShield",
  "ancientScroll",
  "arcaneBlast",
  "celestialLight",
  "heavenlyAegis",
  "ascension",
];
// Three cards in one must beat playing the three apart: roughly twice their sum.
export const FUSED_WIND_STEP_TILES = 18;
export const FUSED_LUCKY_BONUS = 12;
export const FUSED_SCROLL_DRAWS = 6;
export const FUSED_BLAST_PUSH = 30;
/** Own turns of Spectral Armour on top of the shield. */
export const FUSED_SHIELD_ARMOUR = 4;
export const FUSED_AEGIS_TURNS = 9;
/** The Elixir of Life's charge on top of the full energy. */
export const FUSED_HERB_CHARGE = 2;

export function fusibleInHand(hand: readonly CardInstance[]): CardId[] {
  return FUSIBLE_CARDS.filter(
    (cardId) => hand.filter((card) => card.cardId === cardId && !card.fused).length >= FUSION_COPIES,
  );
}

/** Free, any time on the player's turn, and doesn't count as the turn's card. */
export function fuseCards(draft: Draft, playerId: PlayerId, cardId: CardId): void {
  const { hand } = playerIn(draft, playerId);
  if (!fusibleInHand(hand).includes(cardId)) throw new GameRuleError("CANNOT_FUSE");
  const used = hand.filter((card) => card.cardId === cardId && !card.fused).slice(0, FUSION_COPIES);
  const fused: CardInstance = { uid: `${used[0].uid}:fused`, cardId, fused: true };
  updatePlayer(draft, playerId, (player) => ({
    hand: [...player.hand.filter((card) => !used.includes(card)), fused],
  }));
  draft.events.push({ type: "cardsFused", playerId, used: used.map((card) => card.uid), card: fused });
}
