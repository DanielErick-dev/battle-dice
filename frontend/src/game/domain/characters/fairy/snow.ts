import { chargeAbility } from "../../abilities/charge";
import { MAX_ENERGY } from "../../core/energy";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { walkPath } from "../../board/paths";
import { groundSpellsSpare, isUntouchable } from "../../core/playerStatus";
import { isFrozen } from "./winter";
import type { Winter } from "./types";
import type { TileId } from "../../board/types";
import type { PlayerId } from "../../core/state";

export const ENCHANT_ADVANCE = 5;
/** Rounds (lost turns) an opponent stays stuck in the fairy's snow. */
export const ENCHANT_FREEZE = 2;
/** Energy drained into the fairy per round stuck in her snow. */
export const SNOW_DRAIN = 1;
/** Half melted, hell ice only carries her this far. */
export const HELL_ICE_WEAK_AT = 5;
export const HELL_ICE_WEAK_ADVANCE = 3;

/** Whose snow lies on the tile: an enchanted tile's, or the winter's ice, which works just the same. */
function snowOwner(draft: Draft, tile: TileId): PlayerId | null {
  const enchanted = draft.enchantedTiles.find((candidate) => candidate.tile === tile);
  if (enchanted) return enchanted.owner;
  const { winter } = draft;
  return winter && isFrozen(winter, draft.state.board.startTile, tile) ? winter.owner : null;
}

/** True on snow or ice, so nothing else on it happens; the owner is carried, an opponent snowed in. */
export function stirEnchantment(draft: Draft, playerId: PlayerId, tile: TileId): boolean {
  const owner = snowOwner(draft, tile);
  if (!owner) return false;
  const own = ownSnow(draft, playerId, owner);
  if (!own && groundSpellsSpare(playerIn(draft, playerId))) return true;

  if (!own && isUntouchable(playerIn(draft, playerId))) {
    draft.events.push({ type: "armourHeld", playerId, tile });
    return true;
  }
  // An Arcane Shield keeps them out of the snow and is spent; the snow stays for the next.
  if (!own && playerIn(draft, playerId).shielded) {
    updatePlayer(draft, playerId, () => ({ shielded: false }));
    draft.events.push({ type: "trapBlocked", playerId, tile, ward: "shield", hidden: false });
    return true;
  }

  const frozen = own ? 0 : ENCHANT_FREEZE;
  if (!own) snowIn(draft, playerId, owner, frozen);
  stir(draft, playerId, owner, tile, frozen);
  if (own) carryOnSnow(draft, playerId, tile);
  return true;
}

/** How far her snow carries her from `tile`: less off hell ice the fire has half melted. */
function carry(winter: Winter | null, tile: TileId): number {
  const ice = winter?.melting?.find((candidate) => candidate.tile === tile);
  return ice && ice.rounds >= HELL_ICE_WEAK_AT ? HELL_ICE_WEAK_ADVANCE : ENCHANT_ADVANCE;
}

/** Only stopping on more of their own snow carries them on again; wherever else they stop does nothing. */
function carryOnSnow(draft: Draft, playerId: PlayerId, from: TileId): void {
  let tile = from;
  for (;;) {
    const { realmEntry } = playerIn(draft, playerId);
    const path = walkPath(draft.state.board, tile, carry(draft.winter, tile), realmEntry);
    if (path.length === 0) return;
    draft.events.push({ type: "playerMoved", playerId, path });
    tile = path.at(-1) ?? tile;
    updatePlayer(draft, playerId, () => ({ position: tile }));
    const owner = snowOwner(draft, tile);
    if (!owner || !ownSnow(draft, playerId, owner)) return;
    stir(draft, playerId, owner, tile, 0);
  }
}

/** On each lost turn in the snow; what doesn't fit the fairy's bar is lost. */
export function drainSnow(draft: Draft, playerId: PlayerId): void {
  const { snowbound, energy } = playerIn(draft, playerId);
  if (!snowbound) return;
  const taken = Math.min(SNOW_DRAIN, energy);
  updatePlayer(draft, playerId, (player) => ({
    energy: player.energy - taken,
    snowbound: snowbound.rounds > 1 ? { ...snowbound, rounds: snowbound.rounds - 1 } : null,
  }));
  updatePlayer(draft, snowbound.owner, (owner) => ({
    energy: owner.burning > 0 ? owner.energy : Math.min(MAX_ENERGY, owner.energy + taken),
  }));
  draft.events.push({ type: "snowDrained", playerId, owner: snowbound.owner, energy: taken });
}

function snowIn(draft: Draft, playerId: PlayerId, owner: PlayerId, rounds: number): void {
  updatePlayer(draft, playerId, (player) => ({
    skipTurns: player.skipTurns + rounds,
    snowbound: { owner, rounds: Math.max(rounds, player.snowbound?.rounds ?? 0) },
  }));
}

function ownSnow(draft: Draft, playerId: PlayerId, owner: PlayerId): boolean {
  return owner === playerId || draft.players.length === 1;
}

/** Every stir charges the owner's ability a turn. */
function stir(draft: Draft, playerId: PlayerId, owner: PlayerId, tile: TileId, frozen: number): void {
  const before = playerIn(draft, owner);
  const { player: charged, becameReady } = chargeAbility(before);
  updatePlayer(draft, owner, () => ({ abilityCharge: charged.abilityCharge }));
  draft.events.push({
    type: "enchantmentStirred",
    playerId,
    owner,
    tile,
    frozen,
    charged: charged.abilityCharge > before.abilityCharge,
  });
  if (becameReady && charged.ability)
    draft.events.push({ type: "abilityReady", playerId: owner, ability: charged.ability });
}
