import { giveCard } from "../../cards/hand";
import { GameRuleError } from "../../core/errors";
import { updatePlayer, type Draft } from "../../core/draft";
import type { CardInstance, PlayerId } from "../../core/state";
import { isAlchemist } from "./inversion";
import type { PendingRaid } from "./types";

/** Cards that must reach any graveyard (hers included) for her Condenser to fill and give her one of hers back. */
export const CONDENSER_CARDS = 4;

/** `count` cards just went to a graveyard: every Alchemist's Condenser takes them in. */
export function feedCondenser(draft: Draft, count: number): void {
  if (count <= 0) return;
  for (const player of draft.players.filter(isAlchemist)) {
    const condensed = player.alchemist.condensed + count;
    updatePlayer(draft, player.id, (current) => ({ alchemist: { ...current.alchemist, condensed } }));
    draft.events.push({ type: "condenserFed", playerId: player.id, condensed });
  }
}

/** Asks `owner` to pick `picks` cards from a graveyard (only her own when `own`). */
export function openGraveyard(draft: Draft, owner: PlayerId, picks: number, own: boolean): void {
  draft.raid = { owner, picks, own };
  draft.events.push({ type: "graveyardOpened", playerId: owner, picks, own });
}

/** A full Condenser, with a card of hers in her graveyard to take back, opens it (one pick at a time). */
export function drainCondenser(draft: Draft, waiting: boolean): void {
  if (draft.raid || waiting) return;
  const full = draft.players.find(
    (player) => isAlchemist(player) && player.alchemist.condensed >= CONDENSER_CARDS && player.discard.length > 0,
  );
  if (!full) return;
  updatePlayer(draft, full.id, (player) => ({
    alchemist: { ...player.alchemist, condensed: player.alchemist.condensed - CONDENSER_CARDS },
  }));
  openGraveyard(draft, full.id, 1, true);
}

/** Whose graveyards she may pick from, and how many cards she must take (all of them when there are fewer). */
export function raidPiles(players: readonly { id: PlayerId; discard: readonly CardInstance[] }[], raid: PendingRaid) {
  const piles = players.filter((player) => !raid.own || player.id === raid.owner);
  const available = piles.reduce((sum, player) => sum + player.discard.length, 0);
  return { piles, picks: Math.min(raid.picks, available) };
}

/** Moves the picked cards from their graveyards into her hand (a full hand asks for discards as usual). */
export function raidGraveyard(draft: Draft, raid: PendingRaid, cardUids: readonly string[]): void {
  const { piles, picks } = raidPiles(draft.players, raid);
  const found = cardUids.map((uid) => {
    const pile = piles.find((player) => player.discard.some((card) => card.uid === uid));
    const card = pile?.discard.find((candidate) => candidate.uid === uid);
    return pile && card ? { from: pile.id, card } : null;
  });
  if (new Set(cardUids).size !== cardUids.length || cardUids.length !== picks || found.some((entry) => !entry)) {
    throw new GameRuleError("UNKNOWN_CARD");
  }
  const taken = found.filter((entry) => entry !== null);
  for (const { from, card } of taken) {
    updatePlayer(draft, from, (player) => ({ discard: player.discard.filter((held) => held.uid !== card.uid) }));
  }
  draft.events.push({ type: "graveyardRaided", playerId: raid.owner, cards: taken });
  for (const { card } of taken) giveCard(draft, raid.owner, card);
}
