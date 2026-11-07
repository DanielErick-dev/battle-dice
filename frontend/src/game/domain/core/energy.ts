import { playerIn, updatePlayer, type Draft } from "./draft";
import type { PlayerId } from "./state";

export const MAX_ENERGY = 10;
export const STARTING_ENERGY = 1;
/** Own turns per energy gained. */
export const TURNS_PER_ENERGY = 2;

/** Up to `amount`, what still fits the bar; returns what was gained. */
export function gainEnergy(draft: Draft, playerId: PlayerId, amount: number): number {
  const player = playerIn(draft, playerId);
  // Burning on Akane's fire, nothing comes in.
  const gained = player.burning > 0 ? 0 : Math.min(amount, MAX_ENERGY - player.energy);
  updatePlayer(draft, playerId, (player) => ({ energy: player.energy + gained }));
  return gained;
}

/** Up to `amount`, what the player has; returns what was lost. */
export function loseEnergy(draft: Draft, playerId: PlayerId, amount: number): number {
  const lost = Math.min(amount, playerIn(draft, playerId).energy);
  updatePlayer(draft, playerId, (player) => ({ energy: player.energy - lost }));
  return lost;
}
