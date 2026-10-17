import { chargeAbility } from "./abilities";
import { isBlessed, SPRING_ENERGY, wearBlessings } from "./blessings";
import { MAX_ENERGY, TURNS_PER_ENERGY } from "./cards";
import type { Draft } from "./draft";
import { drainSnow, spreadWinter } from "./fairy";
import { burnDown } from "./kunoichi";

/**
 * Ends the current turn: the same player goes again after an extra turn, otherwise play
 * passes on, skipping (and consuming) lost turns. Every TURNS_PER_ENERGY turns a player
 * starts (extra turns included), they gain 1 energy; every turn charges their ability until it's ready,
 * the player whose turn ends is a turn closer to landing from a Levitation (and to the end of their
 * Spectral Armour, of being Untamed and of their black fire: one of their turns is a whole round), and the one whose
 * turn starts a turn closer to the end of a silence. Heaven's blessings wear off a round at a time
 * as their owner's turns end; while they last, the Spring of Light adds energy and Inspiration a
 * second turn of charge as the turn starts. While the player is still in heaven they wait, neither
 * working nor wearing off.
 * Returns the index of the player whose turn it is now.
 */
export function endTurn(draft: Draft, extraTurn: boolean): number {
  const { currentPlayerIndex } = draft.state;
  let index = currentPlayerIndex;
  // A Levitation counts down on its owner's turns: the one ending is spent.
  const ending = draft.players[currentPlayerIndex];
  // So do Spectral Armour, Untamed and black fire.
  draft.players[currentPlayerIndex] = {
    ...ending,
    levitating: Math.max(0, ending.levitating - 1),
    spectralArmour: Math.max(0, ending.spectralArmour - 1),
    divineAegis: Math.max(0, ending.divineAegis - 1),
    untamed: Math.max(0, ending.untamed - 1),
    blessings: wearBlessings(draft.state.board, ending),
  };
  burnDown(draft, ending.id);

  if (!extraTurn) {
    index = (currentPlayerIndex + 1) % draft.players.length;
    // Terminates: every pass consumes one lost turn.
    while (draft.players[index].skipTurns > 0) {
      const skipped = draft.players[index];
      draft.players[index] = {
        ...skipped,
        skipTurns: skipped.skipTurns - 1,
        chained: Math.max(0, skipped.chained - 1),
      };
      draft.events.push({ type: "turnSkipped", playerId: skipped.id });
      // Stuck in the snow, the lost turn feeds the fairy.
      drainSnow(draft, skipped.id);
      index = (index + 1) % draft.players.length;
    }
  }

  // Play came round again: a round went by, and Eternal Winter spreads.
  if (!extraTurn && index <= currentPlayerIndex) spreadWinter(draft);

  const next = draft.players[index];
  const charged = next.energyCharge + 1 >= TURNS_PER_ENERGY;
  const energy = next.energy + (charged ? 1 : 0) + (isBlessed(draft.state.board, next, "spring") ? SPRING_ENERGY : 0);
  const once = chargeAbility({
    ...next,
    silencedTurns: Math.max(0, next.silencedTurns - 1),
    energy: Math.min(MAX_ENERGY, energy),
    energyCharge: charged ? 0 : next.energyCharge + 1,
  });
  const twice = isBlessed(draft.state.board, next, "inspiration")
    ? chargeAbility(once.player)
    : { player: once.player, becameReady: false };
  // A held charge (Time Warp) lets one more turn go by.
  const player = {
    ...twice.player,
    chargeHeld: Math.max(0, twice.player.chargeHeld - 1),
  };
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
