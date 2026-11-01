import { DIVINE_CARDS } from "../../cards/catalog";
import { giveCard } from "../../cards/hand";
import { playerIn, type Draft } from "../../core/draft";
import { grantBlessing, TIMED_BLESSINGS } from "../../board/blessings";
import type { PlayerId } from "../../types";

export const SERAPH_CARD_CHANCE = 0.5;

/** A random timed blessing or heaven card. */
export function seraphBlessing(draft: Draft, playerId: PlayerId): void {
  if (draft.random() < SERAPH_CARD_CHANCE) {
    giveCard(draft, playerId, {
      uid: `${playerId}:grace${draft.state.turn}`,
      cardId: DIVINE_CARDS[Math.floor(draft.random() * DIVINE_CARDS.length)],
    });
    return;
  }
  const blessing = TIMED_BLESSINGS[Math.floor(draft.random() * TIMED_BLESSINGS.length)];
  grantBlessing(draft, playerId, blessing);
  draft.events.push({
    type: "blessingReceived",
    playerId,
    blessing,
    tile: playerIn(draft, playerId).position,
    energyGained: 0,
  });
}
