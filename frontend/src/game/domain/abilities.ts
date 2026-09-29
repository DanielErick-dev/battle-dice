import { MAX_ENERGY } from "./cards";
import type { GameErrorCode } from "./commands";
import type { Player } from "./types";

/**
 * Character abilities. Each charges over its owner's turns, one per turn started, and once
 * charged stays ready until the player chooses to use it; using it empties the charge.
 * - doubleCast: two cards may be played this turn instead of one.
 * - crimsonMarch: this turn's roll walks CRIMSON_MARCH_BONUS tiles further.
 * - celestialGrace: CELESTIAL_GRACE_ENERGY energy, right away.
 * - dragonHoard: DRAGON_HOARD_DRAWS cards drawn, right away.
 * - levitation: the player floats for LEVITATION_TURNS of their turns, this one included: no
 *   tile does anything to them (traps, hidden ones too, curses, blessings, portals…).
 *   Charges over LONG_ABILITY_CYCLE turns.
 * - trapWard: reactive, never used on its own. When a trap (hidden ones too) or a curse is
 *   about to strike, the player is asked whether to spend it and ignore the harm; a trap is
 *   smashed for good. Charges over LONG_ABILITY_CYCLE turns.
 */
export type AbilityId = "doubleCast" | "trapWard" | "crimsonMarch" | "celestialGrace" | "dragonHoard" | "levitation";

/** Turns to charge an ability, from empty. */
export const ABILITY_CYCLE = 3;
/** Trap Ward smashes traps for good and Levitation lasts two turns, so they take longer to come back. */
export const LONG_ABILITY_CYCLE = 5;

/** Turns this ability takes to charge from empty. */
export function abilityCycle(ability: AbilityId | null): number {
  return ability === "trapWard" || ability === "levitation" ? LONG_ABILITY_CYCLE : ABILITY_CYCLE;
}
/** Own turns a Levitation lasts, counting the one it's used on. */
export const LEVITATION_TURNS = 2;
export const CRIMSON_MARCH_BONUS = 2;
export const CELESTIAL_GRACE_ENERGY = 2;
export const DRAGON_HOARD_DRAWS = 2;

/** Abilities that answer a threat instead of being used on the player's turn. */
export function isReactive(ability: AbilityId): boolean {
  return ability === "trapWard";
}

export function isAbilityReady(player: Player): boolean {
  return player.ability !== null && player.abilityCharge >= abilityCycle(player.ability);
}

/**
 * Why the player can't use their ability on their turn right now, or null. The UI asks this
 * to enable its button with the same reasons the engine enforces.
 */
export function abilityBlocker(player: Player, abilityInUse: AbilityId | null): GameErrorCode | null {
  if (player.ability === null) return "NO_ABILITY";
  if (isReactive(player.ability)) return "ABILITY_REACTIVE";
  if (!isAbilityReady(player)) return "ABILITY_NOT_READY";
  if (abilityInUse !== null) return "ABILITY_IN_USE";
  if (player.ability === "celestialGrace" && player.energy >= MAX_ENERGY) return "ENERGY_FULL";
  return null;
}

/** Cards the current player may play this turn. */
export function cardsPerTurn(abilityInUse: AbilityId | null): number {
  return abilityInUse === "doubleCast" ? 2 : 1;
}

/** Tiles the ability in use adds to this turn's roll. */
export function rollBonus(abilityInUse: AbilityId | null): number {
  return abilityInUse === "crimsonMarch" ? CRIMSON_MARCH_BONUS : 0;
}

/** Energy Celestial Grace gives the player now (up to the maximum). */
export function graceEnergy(player: Player): number {
  return player.ability === "celestialGrace" ? Math.min(CELESTIAL_GRACE_ENERGY, MAX_ENERGY - player.energy) : 0;
}

/** The player as their turn starts: one more turn of charge, and whether that made it ready. */
export function chargeAbility(player: Player): {
  player: Player;
  becameReady: boolean;
} {
  if (player.ability === null || isAbilityReady(player)) return { player, becameReady: false };
  const charged = { ...player, abilityCharge: player.abilityCharge + 1 };
  return { player: charged, becameReady: isAbilityReady(charged) };
}
