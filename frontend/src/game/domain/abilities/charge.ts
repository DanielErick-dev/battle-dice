import { playerIn, updatePlayer, type Draft } from "../core/draft";
import type { AbilityId, Player, PlayerId } from "@/game/domain/types";

export const ABILITY_CYCLE = 3;
/** The strongest abilities take longer to come back. */
export const LONG_ABILITY_CYCLE = 5;
export const OCULAR_AWAKENING_CYCLE = 6;
/** Hell's Drag and Time Warp take a whole opponent out of the race: the slowest to return. */
export const HELLS_DRAG_CYCLE = 7;
export const TIME_WARP_CYCLE = 7;
export const VERDICT_CYCLE = 4;

/** Own turns to charge each ability; a new ability doesn't compile until it has one. */
const ABILITY_CYCLES: Readonly<Record<AbilityId, number>> = {
  doubleCast: ABILITY_CYCLE,
  theVoid: ABILITY_CYCLE,
  tailwind: ABILITY_CYCLE,
  studySession: ABILITY_CYCLE,
  seraphBlessing: ABILITY_CYCLE,
  transmutation: ABILITY_CYCLE,
  cardGamble: ABILITY_CYCLE,
  levitation: LONG_ABILITY_CYCLE,
  dormantFury: LONG_ABILITY_CYCLE,
  arrowRain: LONG_ABILITY_CYCLE,
  resurrection: LONG_ABILITY_CYCLE,
  forbiddenSeals: LONG_ABILITY_CYCLE,
  spectralApparitions: LONG_ABILITY_CYCLE,
  fairyBloom: LONG_ABILITY_CYCLE,
  cleansingTide: LONG_ABILITY_CYCLE,
  untamed: LONG_ABILITY_CYCLE,
  plasmaCannon: LONG_ABILITY_CYCLE,
  ocularAwakening: OCULAR_AWAKENING_CYCLE,
  hellsDrag: HELLS_DRAG_CYCLE,
  timeWarp: TIME_WARP_CYCLE,
  silentVerdict: VERDICT_CYCLE,
};

export function abilityCycle(ability: AbilityId | null): number {
  return ability === null ? ABILITY_CYCLE : ABILITY_CYCLES[ability];
}

export function isAbilityReady(player: Player): boolean {
  return player.ability !== null && player.abilityCharge >= abilityCycle(player.ability);
}

/** Untamed and held Time Warp don't charge, unless `fromBoard` (a charge tile always fills a turn). */
export function chargeAbility(
  player: Player,
  { fromBoard = false }: { fromBoard?: boolean } = {},
): {
  player: Player;
  becameReady: boolean;
} {
  const held = !fromBoard && (player.untamed > 0 || player.chargeHeld > 0);
  if (player.ability === null || isAbilityReady(player) || held) return { player, becameReady: false };
  const charged = { ...player, abilityCharge: player.abilityCharge + 1 };
  return { player: charged, becameReady: isAbilityReady(charged) };
}

/** Charges `steps` times in the draft; the caller announces it (announceReady) after its own event. */
export function chargeInDraft(
  draft: Draft,
  playerId: PlayerId,
  steps = 1,
  options: { fromBoard?: boolean } = {},
): { gained: number; becameReady: boolean } {
  const before = playerIn(draft, playerId);
  let player = before;
  let becameReady = false;
  for (let step = 0; step < steps; step++) {
    const charged = chargeAbility(player, options);
    player = charged.player;
    becameReady ||= charged.becameReady;
  }
  updatePlayer(draft, playerId, () => ({ abilityCharge: player.abilityCharge }));
  return { gained: player.abilityCharge - before.abilityCharge, becameReady };
}

export function announceReady(draft: Draft, playerId: PlayerId): void {
  const { ability } = playerIn(draft, playerId);
  if (ability) draft.events.push({ type: "abilityReady", playerId, ability });
}

/** Ascension and the Divine Dawn fill the bar at once. */
export function fillAbility(draft: Draft, playerId: PlayerId): void {
  const { ability } = playerIn(draft, playerId);
  if (ability === null) return;
  updatePlayer(draft, playerId, () => ({ abilityCharge: abilityCycle(ability) }));
  draft.events.push({ type: "abilityReady", playerId, ability });
}
