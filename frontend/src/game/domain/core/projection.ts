import { HIDDEN, hideCards, hiddenCard } from "./hidden";
import type { VoidItem } from "../characters/zarek/types";
import type { GameEvent } from "./events";
import type { GameState, PendingDiscard, Player, PlayerId } from "./state";

/** Who a projection is for: a seat, or null for a spectator, who sees no secret at all. */
export type ViewerId = PlayerId | null;

/** Nobody may predict dice, shuffles or where hidden traps move next. */
const SEALED_RNG = { seed: 0, counter: 0 } as const;

/**
 * What `viewerId` may know of the match: same shape as GameState so the screen runs on it, secrets swapped
 * for HIDDEN or face-down cards. Only for sending; the rules must keep running on the full state.
 */
export function projectState(state: GameState, viewerId: ViewerId): GameState {
  return {
    ...state,
    players: state.players.map((player) => projectPlayer(state, player, viewerId)),
    decks: Object.fromEntries(Object.entries(state.decks).map(([id, cards]) => [id, id === viewerId ? cards : []])),
    pendingDiscard: state.pendingDiscard && projectPendingDiscard(state.pendingDiscard, viewerId),
    // Arrow Rain's pins reveal the hidden traps under them (see characters/archer/).
    hiddenTraps: state.hiddenTraps.filter((tile) => state.pinnedTraps.includes(tile)),
    seals: state.seals.map((seal) => (seal.owner === viewerId ? seal : { ...seal, kind: HIDDEN })),
    rng: SEALED_RNG,
  };
}

function projectPlayer(state: GameState, player: Player, viewerId: ViewerId): Player {
  const own = player.id === viewerId;
  // The Warden picks the stolen cards from the victim's hand, so he sees it while the pick is pending.
  const plundered = state.pendingPlunder?.victim === player.id && state.pendingPlunder.owner === viewerId;
  return {
    ...player,
    hand: own || plundered ? player.hand : hideCards(player.hand),
    // Not even the owner knows the order of their own deck.
    deck: hideCards(player.deck),
    abilityCharge: !own && player.ability === "silentVerdict" ? 0 : player.abilityCharge,
    voidHold: own ? player.voidHold : player.voidHold.map(hideSeal),
  };
}

function projectPendingDiscard(pending: PendingDiscard, viewerId: ViewerId): PendingDiscard {
  return {
    ...pending,
    drawn: pending.playerId === viewerId ? pending.drawn : hiddenCard(0),
    queued: pending.queued.map((entry, index) =>
      entry.playerId === viewerId ? entry : { ...entry, card: hiddenCard(index + 1) },
    ),
  };
}

function hideSeal(item: VoidItem): VoidItem {
  return item.kind === "seal" ? { ...item, seal: HIDDEN } : item;
}

/** The events of one command as `viewerId` may see them; some (Themis arming in secret) are left out. */
export function projectEvents(events: readonly GameEvent[], viewerId: ViewerId): GameEvent[] {
  return events.flatMap((event) => projectEvent(event, viewerId));
}

function projectEvent(event: GameEvent, viewerId: ViewerId): GameEvent[] {
  switch (event.type) {
    case "cardDrawn":
    case "discardRequired":
      return [event.playerId === viewerId ? event : { ...event, card: hiddenCard(0) }];
    case "cardDiscarded":
      // The discarded card lands face up on the pile; the hand left behind doesn't.
      return [event.playerId === viewerId ? event : { ...event, hand: hideCards(event.hand) }];
    case "cardsStolen":
      return [
        viewerId === event.playerId || viewerId === event.from
          ? event
          : { ...event, cards: hideCards(event.cards), discarded: hideCards(event.discarded) },
      ];
    case "abilityReady":
      return event.ability === "silentVerdict" && event.playerId !== viewerId ? [] : [event];
    case "voidSwallowed":
    case "voidCast":
    case "voidSeized":
    case "voidEchoed":
      return [event.playerId === viewerId ? event : { ...event, item: hideSeal(event.item) }];
    default:
      return [event];
  }
}
