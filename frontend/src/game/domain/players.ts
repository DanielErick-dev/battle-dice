import type { Player } from "./types";

/** The Crimson Witch's feet never meet the floor: others' frost and black fire spare her. */
export function groundSpellsSpare(player: Player): boolean {
  return player.ability === "levitation";
}

/** A view matter (shown on a chair, not standing in snow or chains), carried on the events. */
export function isSeated(player: Player): boolean {
  return player.skipTurns > 0 && player.snowbound === null && player.chained === 0;
}

/** Nothing other players aim at them gets through, from cards to a trample. */
export function isUntouchable(player: Player): boolean {
  return player.spectralArmour > 0 || player.untamed > 0;
}

/** Also blocks the board's traps, curses and lost turns, but not hidden traps or black fire. */
export function inSusanoo(player: Player): boolean {
  return player.ability === "ocularAwakening" && player.spectralArmour > 0;
}

export type AimWard = "untamed" | "susanoo" | "armour" | "aegis";

export function aimWard(player: Player): AimWard | null {
  if (player.untamed > 0) return "untamed";
  if (inSusanoo(player)) return "susanoo";
  if (player.spectralArmour > 0) return "armour";
  if (player.divineAegis > 0) return "aegis";
  return null;
}
