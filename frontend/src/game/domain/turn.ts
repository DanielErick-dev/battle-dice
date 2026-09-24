import { MAX_KI } from "./cards";
import type { Draft } from "./draft";

/**
 * Ends the current turn: the same player goes again after an extra turn, otherwise play
 * passes on, skipping (and consuming) lost turns. Whoever starts a turn gains 1 ki.
 * Returns the index of the player whose turn it is now.
 */
export function endTurn(draft: Draft, extraTurn: boolean): number {
  const { currentPlayerIndex } = draft.state;
  let index = currentPlayerIndex;

  if (!extraTurn) {
    index = (currentPlayerIndex + 1) % draft.players.length;
    // Terminates: every pass consumes one lost turn.
    while (draft.players[index].skipTurns > 0) {
      const skipped = draft.players[index];
      draft.players[index] = { ...skipped, skipTurns: skipped.skipTurns - 1 };
      draft.events.push({ type: "turnSkipped", playerId: skipped.id });
      index = (index + 1) % draft.players.length;
    }
  }

  const next = draft.players[index];
  draft.players[index] = { ...next, ki: Math.min(MAX_KI, next.ki + 1) };
  draft.events.push({ type: "turnChanged", playerId: next.id });
  return index;
}
