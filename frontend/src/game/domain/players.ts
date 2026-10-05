import type { Player } from "./types";

/**
 * Spells laid on the ground by others, the Crystal Fairy's frost and black fire, don't touch
 * the player: the Crimson Witch's feet never quite meet the floor.
 */
export function groundSpellsSpare(player: Player): boolean {
  return player.ability === "levitation";
}
