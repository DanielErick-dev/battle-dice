import { at } from "./invariant";
import { chargeAbility } from "../abilities/charge";
import { blessingCount, isBlessed, SPRING_ENERGY, wearBlessings } from "../board/blessings";
import { MAX_ENERGY, TURNS_PER_ENERGY } from "./energy";
import type { Draft } from "./draft";
import { drainSnow } from "../characters/fairy/snow";
import { spreadWinter } from "../characters/fairy/winter";
import { burnDown } from "../characters/kage/flames";
import { burnDownScarlet, feedTheFire } from "../characters/akane/fire";
import { wearTethers } from "../characters/tenzai/elements";
import { wearInversion } from "../characters/alchemist/inversion";
import { tickOverload } from "../characters/alva/systems";

/** Returns the next player's index. Timed effects wear off as their owner's turn ends; charge and energy come as one starts. */
export function endTurn(draft: Draft, earnedExtraTurn: boolean): number {
  const { currentPlayerIndex } = draft.state;
  // The Alchemist plays her banked extra turns (a lost-turn tile turned her way) one after another.
  const banked = !earnedExtraTurn && at(draft.players, currentPlayerIndex).alchemist.extraTurns > 0;
  const extraTurn = earnedExtraTurn || banked;
  let index = currentPlayerIndex;
  // A round on fire pays its Akane, before the burning wears down.
  feedTheFire(draft, at(draft.players, currentPlayerIndex).id);
  const ending = at(draft.players, currentPlayerIndex);
  draft.players[currentPlayerIndex] = {
    ...ending,
    levitating: Math.max(0, ending.levitating - 1),
    spectralArmour: Math.max(0, ending.spectralArmour - 1),
    divineAegis: Math.max(0, ending.divineAegis - 1),
    untamed: Math.max(0, ending.untamed - 1),
    tenzai: { ...ending.tenzai, converged: Math.max(0, ending.tenzai.converged - 1), combustion: null },
    burning: Math.max(0, ending.burning - 1),
    akane: { ...ending.akane, emberStep: false },
    blessings: wearBlessings(draft.state.board, ending),
    ...(ending.ability === "theVoid" && { zarek: { ...ending.zarek, idle: ending.zarek.idle + 1 } }),
    ...(banked && { alchemist: { ...ending.alchemist, extraTurns: ending.alchemist.extraTurns - 1 } }),
  };
  burnDown(draft, ending.id);
  burnDownScarlet(draft, ending.id);
  wearTethers(draft, ending.id);
  wearInversion(draft, ending.id);

  // Stuck by this very turn, the extra turn still owed is spent as the first lost one.
  const passes = !extraTurn || ending.skipTurns > 0;
  if (passes) {
    if (extraTurn) loseTurn(draft, currentPlayerIndex);
    index = (currentPlayerIndex + 1) % draft.players.length;
    // Terminates: every pass consumes one lost turn.
    while (at(draft.players, index).skipTurns > 0) {
      loseTurn(draft, index);
      index = (index + 1) % draft.players.length;
    }
  }

  // Play came round again: a round went by, and Eternal Winter spreads.
  if (passes && index <= currentPlayerIndex) spreadWinter(draft);

  const next = at(draft.players, index);
  const charged = next.energyCharge + 1 >= TURNS_PER_ENERGY;
  // On fire, no energy comes in at all.
  const income = (charged ? 1 : 0) + blessingCount(draft.state.board, next, "spring") * SPRING_ENERGY;
  const energy = next.energy + (next.burning > 0 ? 0 : income);
  // Akane's Fire Zone only starts charging again once all his scarlet fire has gone out (as Untamed does).
  const fireLit = draft.scarletFlames.some((flame) => flame.owner === next.id);
  const once = chargeAbility(
    {
      ...next,
      silencedTurns: Math.max(0, next.silencedTurns - 1),
      emp: Math.max(0, next.emp - 1),
      energy: Math.min(MAX_ENERGY, energy),
      energyCharge: charged ? 0 : next.energyCharge + 1,
    },
    { fireLit },
  );
  const twice = isBlessed(draft.state.board, next, "inspiration")
    ? chargeAbility(once.player, { fireLit })
    : { player: once.player, becameReady: false };
  // A held charge (Time Warp) lets one more turn go by.
  const player = { ...twice.player, chargeHeld: Math.max(0, twice.player.chargeHeld - 1) };
  const becameReady = once.becameReady || twice.becameReady;
  draft.players[index] = player;
  draft.events.push({ type: "turnChanged", playerId: next.id });
  if (becameReady && player.ability)
    draft.events.push({ type: "abilityReady", playerId: next.id, ability: player.ability });
  tickOverload(draft, next.id);
  return index;
}

function loseTurn(draft: Draft, index: number): void {
  const skipped = at(draft.players, index);
  draft.players[index] = {
    ...skipped,
    skipTurns: skipped.skipTurns - 1,
    chained: Math.max(0, skipped.chained - 1),
  };
  draft.events.push({ type: "turnSkipped", playerId: skipped.id });
  // Stuck in the snow, the lost turn feeds the fairy.
  drainSnow(draft, skipped.id);
}
