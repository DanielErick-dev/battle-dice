import type { Player } from "./types";

/**
 * Spells laid on the ground by others, the Crystal Fairy's frost and black fire, don't touch
 * the player: the Crimson Witch's feet never quite meet the floor.
 */
export function groundSpellsSpare(player: Player): boolean {
  return player.ability === "levitation";
}

/**
 * Sitting out lost turns on a chair: not held standing in the fairy's snow or heaven's chains.
 * A view matter (the board shows them seated), carried on the events that act on them.
 */
export function isSeated(player: Player): boolean {
  return player.skipTurns > 0 && player.snowbound === null && player.chained === 0;
}

/**
 * Nothing other players aim at the player gets through (cards, abilities, seals, apparitions,
 * black fire, the fairy's snow, a trample): they're under Spectral Armour, or Untamed.
 */
export function isUntouchable(player: Player): boolean {
  return player.spectralArmour > 0 || player.untamed > 0;
}

/**
 * Kage Rubra under her armour stands inside a Susanoo: on top of what any armour turns away, the
 * board's traps, curses and lost turns can't reach her either. Its weakness is an attack from
 * within: a hidden trap's spike coming up from below, and black fire, still get her.
 */
export function inSusanoo(player: Player): boolean {
  return player.ability === "ocularAwakening" && player.spectralArmour > 0;
}

/**
 * What turns away an ability or a card aimed at the player, or null when it gets through: Untamed,
 * Kage Rubra's Susanoo, Spectral Armour, or heaven's Aegis.
 */
export type AimWard = "untamed" | "susanoo" | "armour" | "aegis";

export function aimWard(player: Player): AimWard | null {
  if (player.untamed > 0) return "untamed";
  if (inSusanoo(player)) return "susanoo";
  if (player.spectralArmour > 0) return "armour";
  if (player.divineAegis > 0) return "aegis";
  return null;
}
