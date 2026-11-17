import { giveCard } from "../../cards/hand";
import { GameRuleError } from "../../core/errors";
import { updatePlayer, type Draft } from "../../core/draft";
import type { CardId } from "../../cards/catalog";
import type { CardInstance, PlayerId } from "../../core/state";
import { isAlchemist } from "./inversion";
import type { PendingRaid } from "./types";

/** Cards that must reach any graveyard (hers included) for her Condenser to fill and give her one of hers back. */
export const CONDENSER_CARDS = 4;
/** Graveyard picks her Condenser gives her per match; once spent, it stops filling. */
export const CONDENSER_RECOVERIES = 3;

type GraveyardOwner = { id: PlayerId; discard: readonly CardInstance[]; graveyard: readonly string[] };

/** Cards that open a graveyard never come back through one: Graveyard Raider would fetch itself forever. */
const NEVER_RAIDED: readonly CardId[] = ["graveyardRaider", "magnumOpus"];

/** The played cards still in `player`'s discard pile that can be taken back, oldest first. */
export function graveyardOf(player: GraveyardOwner): CardInstance[] {
  const played = new Set(player.graveyard);
  return player.discard.filter((card) => played.has(card.uid) && !NEVER_RAIDED.includes(card.cardId));
}

function condenserSpent(player: { alchemist: { recoveries: number } }): boolean {
  return player.alchemist.recoveries >= CONDENSER_RECOVERIES;
}

/** `count` cards just went to a graveyard: every Alchemist's Condenser takes them in, up to full (no backlog). */
export function feedCondenser(draft: Draft, count: number): void {
  if (count <= 0) return;
  for (const player of draft.players.filter((player) => isAlchemist(player) && !condenserSpent(player))) {
    // A full Condenser takes no more, so a pile of burnt cards gives one pick, not a run of them.
    const condensed = Math.min(CONDENSER_CARDS, player.alchemist.condensed + count);
    if (condensed === player.alchemist.condensed) continue;
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
    (player) =>
      isAlchemist(player) &&
      !condenserSpent(player) &&
      player.alchemist.condensed >= CONDENSER_CARDS &&
      graveyardOf(player).length > 0,
  );
  if (!full) return;
  updatePlayer(draft, full.id, (player) => ({
    alchemist: {
      ...player.alchemist,
      condensed: player.alchemist.condensed - CONDENSER_CARDS,
      recoveries: player.alchemist.recoveries + 1,
    },
  }));
  openGraveyard(draft, full.id, 1, true);
}

/** The played cards she may pick, each with whose graveyard it's in, and how many she must take (all, when fewer). */
export function raidPiles(players: readonly GraveyardOwner[], raid: PendingRaid) {
  const offered = players
    .filter((player) => !raid.own || player.id === raid.owner)
    .flatMap((player) => graveyardOf(player).map((card) => ({ from: player.id, card })));
  return { offered, picks: Math.min(raid.picks, offered.length) };
}

/** Moves the picked cards from their graveyards into her hand (a full hand asks for discards as usual). */
export function raidGraveyard(draft: Draft, raid: PendingRaid, cardUids: readonly string[]): void {
  const { offered, picks } = raidPiles(draft.players, raid);
  const found = cardUids.map((uid) => offered.find(({ card }) => card.uid === uid) ?? null);
  if (new Set(cardUids).size !== cardUids.length || cardUids.length !== picks || found.some((entry) => !entry)) {
    throw new GameRuleError("UNKNOWN_CARD");
  }
  const taken = found.filter((entry) => entry !== null);
  for (const { from, card } of taken) {
    updatePlayer(draft, from, (player) => ({
      discard: player.discard.filter((held) => held.uid !== card.uid),
      graveyard: player.graveyard.filter((uid) => uid !== card.uid),
    }));
  }
  draft.events.push({ type: "graveyardRaided", playerId: raid.owner, cards: taken });
  for (const { card } of taken) giveCard(draft, raid.owner, card);
}
