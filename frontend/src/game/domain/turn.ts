import { chargeAbility } from "./abilities";
import { isBlessed, SPRING_ENERGY, wearBlessings } from "./blessings";
import { MAX_ENERGY, TURNS_PER_ENERGY } from "./cards";
import type { Draft } from "./draft";
import { burnDown } from "./kunoichi";

/**
 * Ends the current turn: the same player goes again after an extra turn, otherwise play
 * passes on, skipping (and consuming) lost turns. Every TURNS_PER_ENERGY turns a player
 * starts (extra turns included), they gain 1 energy; every turn charges their ability until it's ready,
 * the player whose turn ends is a turn closer to landing from a Levitation (and to the end of their
 * Spectral Armour and of their black fire: one of their turns is a whole round), and the one whose
 * turn starts a turn closer to the end of a silence. Heaven's blessings wear off a round at a time
 * as their owner's turns end; while they last, the Spring of Light adds energy and Inspiration a
 * second turn of charge as the turn starts.
 * Returns the index of the player whose turn it is now.
 */
export function endTurn(draft: Draft, extraTurn: boolean): number {
  const { currentPlayerIndex } = draft.state;
  let index = currentPlayerIndex;
  // A Levitation counts down on its owner's turns: the one ending is spent.
  const ending = draft.players[currentPlayerIndex];
  // So do Spectral Armour and black fire.
  draft.players[currentPlayerIndex] = {
    ...ending,
    levitating: Math.max(0, ending.levitating - 1),
    spectralArmour: Math.max(0, ending.spectralArmour - 1),
    blessings: wearBlessings(ending),
  };
  burnDown(draft, ending.id);

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
  const energy = next.energy + (charged ? 1 : 0) + (isBlessed(next, "spring") ? SPRING_ENERGY : 0);
  const once = chargeAbility({
    ...next,
    silencedTurns: Math.max(0, next.silencedTurns - 1),
    energy: Math.min(MAX_ENERGY, energy),
    energyCharge: charged ? 0 : next.energyCharge + 1,
  });
  const twice = isBlessed(next, "inspiration")
    ? chargeAbility(once.player)
    : { player: once.player, becameReady: false };
  const player = twice.player;
  const becameReady = once.becameReady || twice.becameReady;
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
