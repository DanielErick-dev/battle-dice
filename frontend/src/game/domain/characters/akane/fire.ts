import { getTile } from "../../board/board";
import { walkPath } from "../../board/paths";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { groundSpellsSpare, isUntouchable } from "../../core/playerStatus";
import { thaw } from "../fairy/winter";
import { MAX_ENERGY } from "../../core/energy";
import type { TileId } from "../../board/types";
import type { DiceBoost, Player, PlayerId } from "../../core/state";

/** Fire Zone: the tiles ahead it sets alight, and the rounds (his turns) they burn. */
export const FIRE_ZONE_RANGE = 20;
export const SCARLET_ROUNDS = 2;
/** Own turns someone stays on fire: rolls halved (rounded down), no energy gained. */
export const BURN_ROUNDS = 2;
/** Energy Akane takes each round from everyone he has set alight. */
export const FIRE_TOLL = 1;
/** Brilliant Impetus: Inner Flame he can hold, and a die this low (or a trap) kindles one more. */
export const INNER_FLAME_MAX = 3;
export const LOW_DIE = 2;
/** Unleashed at INNER_FLAME_MAX: his next IMPETUS_ROLLS rolls walk IMPETUS_BONUS further and scorch the way. */
export const IMPETUS_BONUS = 3;
export const IMPETUS_ROLLS = 2;
export const IMPETUS_PUSH = 3;

export function isAkane(player: Player): boolean {
  return player.ability === "fireZone";
}

export function isBurning(player: Player): boolean {
  return player.burning > 0;
}

/** Never the start or finish, nor a tile black fire already holds. */
function flammable(draft: Draft, tile: TileId): boolean {
  const { role } = getTile(draft.state.board, tile);
  if (role === "start" || role === "finish") return false;
  return !draft.blackFlames.some((flame) => flame.tile === tile);
}

/** Fire Zone: the FIRE_ZONE_RANGE tiles ahead of him, along his own path. */
export function fireZone(draft: Draft, playerId: PlayerId): void {
  const { position, realmEntry } = playerIn(draft, playerId);
  lightScarlet(draft, playerId, walkPath(draft.state.board, position, FIRE_ZONE_RANGE, realmEntry), [], { zone: true });
}

/**
 * Sets `tiles` alight for SCARLET_ROUNDS (a fire already there starts over). Scarlet fire beats frost, the fairy's
 * snow and even winter's ice: they melt for good (a trap under the snow is back once the fire dies). Whoever
 * stands there catches fire, but `spare`.
 */
export function lightScarlet(
  draft: Draft,
  owner: PlayerId,
  tiles: readonly TileId[],
  spare: PlayerId[] = [],
  { zone = false }: { zone?: boolean } = {},
): void {
  const lit = tiles.filter((tile) => flammable(draft, tile));
  if (lit.length === 0) return;
  const melted = draft.enchantedTiles.filter((enchanted) => lit.includes(enchanted.tile)).map(({ tile }) => tile);
  draft.enchantedTiles = draft.enchantedTiles.filter((enchanted) => !lit.includes(enchanted.tile));
  const thawed = thaw(draft, lit);
  draft.scarletFlames = [
    ...draft.scarletFlames.filter((flame) => !lit.includes(flame.tile)),
    // The turn it's lit on ends at once and counts down one: SCARLET_ROUNDS whole rounds still follow.
    ...lit.map((tile) => ({ tile, owner, turnsLeft: SCARLET_ROUNDS + 1 })),
  ];
  const event = {
    type: "scarletLit",
    playerId: owner,
    tiles: lit,
    melted: [...new Set([...melted, ...thawed])],
  } as const;
  draft.events.push(zone ? { ...event, zone } : event);
  for (const player of draft.players) {
    if (player.id === owner || spare.includes(player.id) || !lit.includes(player.position)) continue;
    setAblaze(draft, player.id, owner, { tile: player.position });
  }
}

/**
 * On fire for BURN_ROUNDS of their own turns (one more if it's their turn now, as it ends at once). Akane's own element
 * never burns him; fire on the ground spares the floating Witch and anyone untouchable.
 */
export function setAblaze(draft: Draft, playerId: PlayerId, by: PlayerId, { tile }: { tile?: TileId } = {}): void {
  const victim = playerIn(draft, playerId);
  if (isAkane(victim)) return;
  if (tile !== undefined && groundSpellsSpare(victim)) return;
  if (tile !== undefined && isUntouchable(victim)) {
    draft.events.push({ type: "armourHeld", playerId, tile });
    return;
  }
  const current = draft.players[draft.state.currentPlayerIndex]?.id === playerId;
  const rounds = BURN_ROUNDS + (current ? 1 : 0);
  updatePlayer(draft, playerId, (player) => ({ burning: Math.max(player.burning, rounds), burnedBy: by }));
  draft.events.push({ type: "playerIgnited", playerId, by, rounds: BURN_ROUNDS, ...(tile !== undefined && { tile }) });
}

/** Stopping on scarlet fire sets you alight; only the fire is there (its tile does nothing). */
export function landOnScarlet(draft: Draft, playerId: PlayerId, tile: TileId): boolean {
  const flame = draft.scarletFlames.find((candidate) => candidate.tile === tile);
  if (!flame) return false;
  if (flame.owner !== playerId) setAblaze(draft, playerId, flame.owner, { tile });
  return true;
}

/** One of `owner`'s turns is a whole round for his fires. */
export function burnDownScarlet(draft: Draft, owner: PlayerId): void {
  const lowered = draft.scarletFlames.map((flame) =>
    flame.owner === owner ? { ...flame, turnsLeft: flame.turnsLeft - 1 } : flame,
  );
  const out = lowered.filter((flame) => flame.turnsLeft <= 0).map((flame) => flame.tile);
  draft.scarletFlames = lowered.filter((flame) => flame.turnsLeft > 0);
  if (out.length > 0) draft.events.push({ type: "scarletFaded", owner, tiles: out });
}

/** Puts out `playerIds` (those on fire). */
export function quench(draft: Draft, by: PlayerId, playerIds: readonly PlayerId[]): void {
  const burning = playerIds.filter((id) => isBurning(playerIn(draft, id)));
  if (burning.length === 0) return;
  for (const id of burning) updatePlayer(draft, id, () => ({ burning: 0 }));
  draft.events.push({ type: "fireQuenched", playerIds: burning, by });
}

/** The Cleansing Tide drowns the scarlet fire on `reach` and whoever burns there. */
export function drownScarlet(draft: Draft, by: PlayerId, reach: ReadonlySet<TileId>): void {
  draft.scarletFlames = draft.scarletFlames.filter((flame) => !reach.has(flame.tile));
  quench(
    draft,
    by,
    draft.players.filter((player) => reach.has(player.position)).map((player) => player.id),
  );
}

/** Brilliant Impetus: a low die or a trap kindles one more Inner Flame, none while the Impetus burns. */
export function kindle(draft: Draft, playerId: PlayerId): void {
  const player = playerIn(draft, playerId);
  if (!isAkane(player) || player.impetusRolls > 0 || player.innerFlame >= INNER_FLAME_MAX) return;
  const flames = player.innerFlame + 1;
  updatePlayer(draft, playerId, () => ({ innerFlame: flames }));
  draft.events.push({ type: "innerFlameKindled", playerId, flames });
}

/** Before a roll: a full Inner Flame unleashes the Impetus; Pure Fuel throws two dice while an opponent burns. */
export function prepareRoll(draft: Draft, playerId: PlayerId): { bonus: number; boost: DiceBoost | null } {
  const player = playerIn(draft, playerId);
  if (isAkane(player) && player.innerFlame >= INNER_FLAME_MAX && player.impetusRolls === 0) {
    updatePlayer(draft, playerId, () => ({ innerFlame: 0, impetusRolls: IMPETUS_ROLLS }));
    draft.events.push({ type: "impetusUnleashed", playerId, rolls: IMPETUS_ROLLS });
  }
  const { diceBoost, fuelRolls, impetusRolls } = playerIn(draft, playerId);
  const fuelled =
    fuelRolls > 0 && diceBoost === null && draft.players.some((other) => other.id !== playerId && isBurning(other));
  if (fuelRolls > 0) updatePlayer(draft, playerId, () => ({ fuelRolls: fuelRolls - 1 }));
  return { bonus: impetusRolls > 0 ? IMPETUS_BONUS : 0, boost: fuelled ? { kind: "double" } : diceBoost };
}

/** After the walk: a low die kindles a flame (a chosen value doesn't count), and the Impetus burns one roll down. */
export function settleRoll(draft: Draft, playerId: PlayerId, face: number, chosen: boolean): void {
  const player = playerIn(draft, playerId);
  if (player.impetusRolls > 0) {
    updatePlayer(draft, playerId, () => ({ impetusRolls: player.impetusRolls - 1 }));
    return;
  }
  if (!chosen && face <= LOW_DIE) kindle(draft, playerId);
}

/** Half the walk, rounded down (a 1 doesn't move them at all). */
export function burntRoll(value: number): number {
  return Math.floor(value / 2);
}

/**
 * A round on fire feeds the one who lit it: as a burning player's turn ends, their Akane gains FIRE_TOLL energy,
 * taken from them while they have it (on fire, nothing comes in to refill it).
 */
export function feedTheFire(draft: Draft, playerId: PlayerId): void {
  const victim = playerIn(draft, playerId);
  const by = victim.burnedBy;
  if (!isBurning(victim) || by === null || !draft.players.some((player) => player.id === by)) return;
  const taken = Math.min(FIRE_TOLL, victim.energy);
  updatePlayer(draft, playerId, (player) => ({ energy: player.energy - taken }));
  updatePlayer(draft, by, (player) => ({ energy: Math.min(MAX_ENERGY, player.energy + FIRE_TOLL) }));
  draft.events.push({ type: "fireFed", playerId, by, energy: taken });
}
