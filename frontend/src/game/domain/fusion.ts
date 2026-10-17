import type { CardId } from "./cards";
import { GameRuleError } from "./commands";
import { playerIn, updatePlayer, type Draft } from "./draft";
import type { CardInstance, PlayerId } from "./types";

/** Copies of the same card in hand that fuse into one. */
export const FUSION_COPIES = 3;

/**
 * The cards that fuse, and what their fused form does instead (see cardPlay): the everyday cards a
 * deck holds several of. Rare and stronger cards, and heaven's relics, don't fuse.
 */
export const FUSIBLE_CARDS: readonly CardId[] = [
  "windStep",
  "healingHerb",
  "luckyCharm",
  "arcaneShield",
  "ancientScroll",
  "arcaneBlast",
  // Heaven's relics fuse too, into something divine.
  "celestialLight",
  "heavenlyAegis",
  "ascension",
];
/** Fused Wind Step: tiles it carries the player ahead. */
export const FUSED_WIND_STEP_TILES = 9;
/** Fused Lucky Charm: tiles added to the next roll. */
export const FUSED_LUCKY_BONUS = 10;
/** Fused Ancient Scroll: cards drawn. */
export const FUSED_SCROLL_DRAWS = 5;
/** Fused Arcane Blast: tiles it knocks the opponent back. */
export const FUSED_BLAST_PUSH = 15;
/** Fused Arcane Shield: own turns of Spectral Armour on top of the shield. */
export const FUSED_SHIELD_ARMOUR = 2;
/** Fused Heavenly Aegis (Sanctuary): own turns of the Aegis, and the Arcane Shield with it. */
export const FUSED_AEGIS_TURNS = 6;

/** The cards the player holds enough plain copies of to fuse right now. */
export function fusibleInHand(hand: readonly CardInstance[]): CardId[] {
  return FUSIBLE_CARDS.filter(
    (cardId) => hand.filter((card) => card.cardId === cardId && !card.fused).length >= FUSION_COPIES,
  );
}

/**
 * The relics: Celestial Light becomes the Divine Dawn (full energy, the ability ready, freed of lost
 * turns and snow), the Heavenly Aegis the Celestial Sanctuary (FUSED_AEGIS_TURNS of the Aegis plus the
 * Arcane Shield) and Ascension the Apotheosis (the ability ready, and another turn once this one ends).
 *
 * Card Fusion: FUSION_COPIES plain copies of `cardId` in the player's hand become one fused card of
 * it, far stronger (see FUSIBLE_CARDS). It's free, any time on their turn, and isn't the turn's card.
 */
export function fuseCards(draft: Draft, playerId: PlayerId, cardId: CardId): void {
  const { hand } = playerIn(draft, playerId);
  if (!fusibleInHand(hand).includes(cardId)) throw new GameRuleError("CANNOT_FUSE");
  const used = hand.filter((card) => card.cardId === cardId && !card.fused).slice(0, FUSION_COPIES);
  const fused: CardInstance = {
    uid: `${used[0].uid}:fused`,
    cardId,
    fused: true,
  };
  updatePlayer(draft, playerId, (player) => ({
    hand: [...player.hand.filter((card) => !used.includes(card)), fused],
  }));
  draft.events.push({
    type: "cardsFused",
    playerId,
    used: used.map((card) => card.uid),
    card: fused,
  });
}
