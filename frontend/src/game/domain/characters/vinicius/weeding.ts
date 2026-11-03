import { smashTrap } from "../../board/traps";
import { playerIn, type Draft } from "../../core/draft";
import type { PlayerId, Threat, TileId } from "@/game/domain/types";

export function isVinicius(player: { ability: string | null }): boolean {
  return player.ability === "weeding";
}

/**
 * Vinicius stops on a trap, hidden or not, and hoes it out before it can bite: gone for good, nothing happens to
 * him. Returns whether he did (the tile then does nothing else).
 */
export function weedOut(draft: Draft, playerId: PlayerId, tile: TileId, harm: Threat | null): boolean {
  if (harm !== "trap" && harm !== "hiddenTrap") return false;
  if (!isVinicius(playerIn(draft, playerId))) return false;
  smashTrap(draft, tile);
  draft.events.push({ type: "trapWeeded", playerId, tile, hidden: harm === "hiddenTrap" });
  return true;
}
