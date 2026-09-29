import { chargeAbility } from "./abilities";
import { MAX_ENERGY, TURNS_PER_ENERGY } from "./cards";
import type { Draft } from "./draft";

/**
 * Ends the current turn: the same player goes again after an extra turn, otherwise play
 * passes on, skipping (and consuming) lost turns. Every TURNS_PER_ENERGY turns a player
 * starts (extra turns included), they gain 1 energy; every turn charges their ability until it's ready.
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
  const charged = next.energyCharge + 1 >= TURNS_PER_ENERGY;
  const { player, becameReady } = chargeAbility({
    ...next,
    energy: charged ? Math.min(MAX_ENERGY, next.energy + 1) : next.energy,
    energyCharge: charged ? 0 : next.energyCharge + 1,
  });
  draft.players[index] = player;
  draft.events.push({ type: "turnChanged", playerId: next.id });
  if (becameReady && player.ability)
    draft.events.push({
      type: "abilityReady",
      playerId: next.id,
      ability: player.ability,
    });
  return index;
}
