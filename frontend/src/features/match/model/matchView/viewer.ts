import type { PlayerId } from "@/game/domain/core/ids";
import { canActivateAbility, canPlayCard, canRoll } from "./queries";
import type { MatchView } from "./view";

/** What this screen may do right now; every control that sends a command reads it (see model/README.md). */
export interface ViewerControls {
  /** Whose hand and secrets the screen shows: the pinned seat, whoever's turn it is in hot-seat, null for a spectator. */
  viewerId: PlayerId | null;
  /** The turn is the viewer's (always, in hot-seat): their clock runs and they may pause. */
  ownsTurn: boolean;
  /** Rolling, fusing, burning energy and setting the Void's things down. */
  canRoll: boolean;
  canPlayCard: boolean;
  canActivateAbility: boolean;
  /** Each pending prompt, true when it's waiting and the viewer is the one to answer it. */
  answers: { discard: boolean; ward: boolean; grace: boolean; plunder: boolean; raid: boolean };
  /** Someone else the screen waits on (their prompt first, then their turn); null when it's up to the viewer. */
  waitingFor: PlayerId | null;
}

/** The player a pending prompt waits on, if any. */
function promptOwner(view: MatchView): PlayerId | null {
  return (
    view.pendingDiscard?.playerId ??
    view.pendingWard?.playerId ??
    view.pendingGrace?.playerId ??
    view.pendingPlunder?.owner ??
    view.pendingRaid?.owner ??
    null
  );
}

/**
 * `seat` is the pinned seat, or null in hot-seat, where the screen always speaks for whoever's turn it is.
 * A `spectator` (the party TV) has no seat either, but speaks for no one: it only watches.
 */
export function viewerControls(
  view: MatchView,
  seat: PlayerId | null,
  spectator = false,
  bots: readonly PlayerId[] = [],
): ViewerControls {
  // The computer's seats speak for themselves (see model/bots.ts): the screen only watches them.
  const speaksFor = (id: PlayerId | undefined) =>
    !spectator && id !== undefined && !bots.includes(id) && (seat === null || id === seat);
  const ownsTurn = speaksFor(view.activePlayerId);
  const owner = promptOwner(view);
  const waitingOn = owner ?? view.activePlayerId;
  return {
    viewerId: spectator || (seat === null && bots.includes(view.activePlayerId)) ? null : (seat ?? view.activePlayerId),
    ownsTurn,
    canRoll: ownsTurn && canRoll(view),
    canPlayCard: ownsTurn && canPlayCard(view),
    canActivateAbility: ownsTurn && canActivateAbility(view),
    answers: {
      discard: speaksFor(view.pendingDiscard?.playerId),
      ward: speaksFor(view.pendingWard?.playerId),
      grace: speaksFor(view.pendingGrace?.playerId),
      plunder: speaksFor(view.pendingPlunder?.owner),
      raid: speaksFor(view.pendingRaid?.owner),
    },
    waitingFor: view.winnerId === null && !speaksFor(waitingOn) ? waitingOn : null,
  };
}
