import {
  ARMOUR_TURNS,
  chargeAbility,
  FLAME_ENERGY,
  FLAME_HITS,
  FLAME_PUSH,
  FLAME_TILES,
  FLAME_TURNS,
  SUSANOO_PUSH,
} from "./abilities";
import { GameRuleError } from "./commands";
import { getTile } from "./board";
import { playerIn, pushPath, updatePlayer, walkPath, type Draft } from "./draft";
import { groundSpellsSpare, inSusanoo, isUntouchable } from "./players";
import type { Board, PlayerId, TileId } from "./types";

/**
 * Tiles Eternal Flames can set alight: any tile of the main path, however far (not the start or
 * finish, nor a realm track), the player's own included, other than those already burning
 * (`burning`). Nearest first.
 */
export function flammableTiles(board: Board, position: TileId, burning: readonly TileId[]): TileId[] {
  return board.tiles
    .filter(({ id, role, track }) => role === "regular" && !track && !burning.includes(id))
    .map(({ id }) => id)
    .sort((a, b) => Math.abs(a - position) - Math.abs(b - position) || a - b);
}

/** Eternal Flames: FLAME_TILES tiles the player picked (fewer if they like) burn for FLAME_TURNS rounds. */
export function lightFlames(draft: Draft, playerId: PlayerId, tiles: readonly TileId[]): void {
  const allowed = flammableTiles(
    draft.state.board,
    playerIn(draft, playerId).position,
    draft.blackFlames.map((flame) => flame.tile),
  );
  if (
    tiles.length === 0 ||
    tiles.length > FLAME_TILES ||
    new Set(tiles).size !== tiles.length ||
    tiles.some((tile) => !allowed.includes(tile))
  ) {
    throw new GameRuleError("INVALID_FLAMES");
  }
  draft.blackFlames = [
    ...draft.blackFlames,
    ...tiles.map((tile) => ({ tile, owner: playerId, turnsLeft: FLAME_TURNS, hits: 0 })),
  ];
  // Fire beats frost: the fairy's snow under it melts away for good.
  draft.enchantedTiles = draft.enchantedTiles.filter((enchanted) => !tiles.includes(enchanted.tile));
  draft.events.push({ type: "flamesLit", playerId, tiles: [...tiles] });
}

/** Spectral Armour: for ARMOUR_TURNS of their turns, nothing other players aim at the player gets through. */
export function raiseArmour(draft: Draft, playerId: PlayerId): void {
  updatePlayer(draft, playerId, () => ({ spectralArmour: ARMOUR_TURNS }));
  draft.events.push({ type: "armourRaised", playerId, turns: ARMOUR_TURNS });
}

/**
 * The player stopped on `tile`: black fire there that isn't theirs scorches them, taking
 * FLAME_ENERGY energy and throwing them FLAME_PUSH tiles back, and the fire's owner gains a turn
 * of ability charge. Walking through doesn't burn.
 * Spectral Armour (or being Untamed) turns it away, though not Kage Rubra's Susanoo (see inSusanoo), and the
 * Crimson Witch walks through fire unharmed (see
 * groundSpellsSpare). The player's own fire doesn't burn them.
 */
export function scorch(draft: Draft, playerId: PlayerId, tile: TileId): void {
  const flame = draft.blackFlames.find((candidate) => candidate.owner !== playerId && candidate.tile === tile);
  if (!flame || groundSpellsSpare(playerIn(draft, playerId))) return;
  // Fire gets inside a Susanoo: it's the one armour it burns through.
  const victim = playerIn(draft, playerId);
  if (isUntouchable(victim) && !inSusanoo(victim)) {
    draft.events.push({ type: "armourHeld", playerId, tile: flame.tile });
    return;
  }
  // Each fire scorches FLAME_HITS times before it burns itself out.
  const hits = flame.hits + 1;
  draft.blackFlames = draft.blackFlames
    .map((candidate) => (candidate === flame ? { ...candidate, hits } : candidate))
    .filter((candidate) => candidate.hits < FLAME_HITS);
  const energyLost = Math.min(FLAME_ENERGY, playerIn(draft, playerId).energy);
  updatePlayer(draft, playerId, (player) => ({ energy: player.energy - energyLost }));
  // Every victim feeds the fire's owner: a turn of charge for their ability.
  const before = playerIn(draft, flame.owner);
  const { player: charged, becameReady } = chargeAbility(before);
  updatePlayer(draft, flame.owner, () => ({ abilityCharge: charged.abilityCharge }));
  draft.events.push({
    type: "flamesScorched",
    playerId,
    owner: flame.owner,
    tile: flame.tile,
    energyLost,
    charged: charged.abilityCharge > before.abilityCharge,
  });
  if (becameReady && charged.ability) {
    draft.events.push({ type: "abilityReady", playerId: flame.owner, ability: charged.ability });
  }
  const from = playerIn(draft, playerId).position;
  const pushed = pushPath(draft.state.board, from, FLAME_PUSH);
  draft.events.push({ type: "playerPushed", playerId, by: flame.owner, path: pushed });
  updatePlayer(draft, playerId, () => ({ position: pushed.at(-1) ?? from }));
  if (hits >= FLAME_HITS) draft.events.push({ type: "flamesFaded", owner: flame.owner, tiles: [flame.tile] });
}

/**
 * One of `owner`'s turns is over, so a whole round has gone by for their fires: they burn lower,
 * and those out of rounds go out.
 */
export function burnDown(draft: Draft, owner: PlayerId): void {
  const lowered = draft.blackFlames.map((flame) =>
    flame.owner === owner ? { ...flame, turnsLeft: flame.turnsLeft - 1 } : flame,
  );
  const out = lowered.filter((flame) => flame.turnsLeft <= 0).map((flame) => flame.tile);
  draft.blackFlames = lowered.filter((flame) => flame.turnsLeft > 0);
  if (out.length > 0) draft.events.push({ type: "flamesFaded", owner, tiles: out });
}

/**
 * Stopping on Kage Rubra's tile while her Susanoo stands there: it won't let them, and they're thrown
 * back SUSANOO_PUSH tiles (where nothing on the tile happens to them). False when no Susanoo is
 * there, or there's nowhere behind to throw them.
 */
export function repelledBySusanoo(draft: Draft, playerId: PlayerId, landed: TileId): boolean {
  const guardian = draft.players.find(
    (player) => player.id !== playerId && player.position === landed && inSusanoo(player),
  );
  if (!guardian) return false;
  const path = pushPath(draft.state.board, landed, SUSANOO_PUSH, playerIn(draft, playerId).realmEntry);
  const to = path.at(-1);
  if (to === undefined) return false;
  draft.events.push({ type: "susanooRepelled", playerId, by: guardian.id, tile: landed, to, ahead: false });
  updatePlayer(draft, playerId, () => ({ position: to }));
  return true;
}

/**
 * Kage Rubra stopping, inside her Susanoo, on a tile where others stand: it sweeps them off it,
 * SUSANOO_PUSH tiles ahead (where nothing on the tile happens to them; never onto the finish).
 * Those Untamed or armoured hold their ground.
 */
export function sweptBySusanoo(draft: Draft, playerId: PlayerId, landed: TileId): void {
  if (!inSusanoo(playerIn(draft, playerId))) return;
  const { board } = draft.state;
  for (const other of draft.players) {
    if (other.id === playerId || other.position !== landed || isUntouchable(other)) continue;
    const to = walkPath(board, landed, SUSANOO_PUSH, other.realmEntry).at(-1);
    if (to === undefined || getTile(board, to).role === "finish") continue;
    draft.events.push({ type: "susanooRepelled", playerId: other.id, by: playerId, tile: landed, to, ahead: true });
    updatePlayer(draft, other.id, () => ({ position: to }));
  }
}
