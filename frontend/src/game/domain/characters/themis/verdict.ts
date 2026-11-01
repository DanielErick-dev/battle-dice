import { isAbilityReady } from "../../abilities/charge";
import type { AbilityId } from "../../abilities/ability";
import { MAX_ENERGY } from "../../core/energy";
import type { CardId } from "../../cards/catalog";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import type { Player, PlayerId } from "../../core/state";
import type { TileId } from "../../board/types";

/** Each hidden trap Themis's Blind Scale disarms on her way. */
export const BLIND_SCALE_ENERGY = 1;

/** Her Silent Verdict, charged: the next thing an opponent aims at her turns on them. */
export function verdictArmed(player: Player): boolean {
  return player.ability === "silentVerdict" && isAbilityReady(player);
}

/** Spends her verdict on `attackerId`; the caller then turns the attack on them. */
export function passVerdict(
  draft: Draft,
  judgeId: PlayerId,
  attackerId: PlayerId,
  aim: { cardId: CardId } | { ability: AbilityId },
): void {
  updatePlayer(draft, judgeId, () => ({ abilityCharge: 0 }));
  draft.events.push({ type: "verdictPassed", playerId: judgeId, attackerId, ...aim });
}

/** Her Blind Scale: hidden traps on her path are disarmed for good, before she lands. */
export function senseHiddenTraps(draft: Draft, playerId: PlayerId, path: readonly TileId[]): void {
  if (playerIn(draft, playerId).ability !== "silentVerdict") return;
  for (const tile of path) {
    if (!draft.hiddenTraps.includes(tile)) continue;
    draft.hiddenTraps = draft.hiddenTraps.filter((trap) => trap !== tile);
    const { energy } = playerIn(draft, playerId);
    const gained = Math.min(MAX_ENERGY, energy + BLIND_SCALE_ENERGY) - energy;
    updatePlayer(draft, playerId, () => ({ energy: energy + gained }));
    draft.events.push({ type: "hiddenTrapDisarmed", playerId, tile, energyGained: gained });
  }
}
