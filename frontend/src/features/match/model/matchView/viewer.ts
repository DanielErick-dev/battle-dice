import type { PlayerId } from "@/game/domain/core/ids";
import { canActivateAbility, canPlayCard, canRoll } from "./queries";
import type { MatchView } from "./view";

/** What this screen may do right now; every control that sends a command reads it (see model/README.md). */
export interface ViewerControls {
  /** Whose hand and secrets the screen shows: the pinned seat, or whoever's turn it is in hot-seat. */
  viewerId: PlayerId;
  /** The turn is the viewer's (always, in hot-seat): their clock runs and they may pause. */
  ownsTurn: boolean;
  /** Rolling, fusing, burning energy and setting the Void's things down. */
  canRoll: boolean;
  canPlayCard: boolean;
  canActivateAbility: boolean;
  /** Each pending prompt, true when it's waiting and the viewer is the one to answer it. */
  answers: { discard: boolean; ward: boolean; grace: boolean; plunder: boolean };
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
    null
  );
}

/** `seat` is the pinned seat, or null in hot-seat, where the screen always speaks for whoever's turn it is. */
export function viewerControls(view: MatchView, seat: PlayerId | null): ViewerControls {
  const speaksFor = (id: PlayerId | undefined) => id !== undefined && (seat === null || id === seat);
  const ownsTurn = speaksFor(view.activePlayerId);
  const owner = promptOwner(view);
  const waitingOn = owner ?? view.activePlayerId;
  return {
    viewerId: seat ?? view.activePlayerId,
    ownsTurn,
    canRoll: ownsTurn && canRoll(view),
    canPlayCard: ownsTurn && canPlayCard(view),
    canActivateAbility: ownsTurn && canActivateAbility(view),
    answers: {
      discard: speaksFor(view.pendingDiscard?.playerId),
      ward: speaksFor(view.pendingWard?.playerId),
      grace: speaksFor(view.pendingGrace?.playerId),
      plunder: speaksFor(view.pendingPlunder?.owner),
    },
    waitingFor: view.winnerId === null && !speaksFor(waitingOn) ? waitingOn : null,
  };
}
