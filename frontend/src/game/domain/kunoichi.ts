import {
  ARMOUR_TURNS,
  chargeAbility,
  FLAME_ENERGY,
  FLAME_HITS,
  FLAME_PUSH,
  FLAME_TILES,
  FLAME_TURNS,
} from "./abilities";
import { GameRuleError } from "./commands";
import { playerIn, pushPath, updatePlayer, type Draft } from "./draft";
import { groundSpellsSpare } from "./players";
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
 * Spectral Armour turns it away, and the Crimson Witch walks through fire unharmed (see
 * groundSpellsSpare). The player's own fire doesn't burn them.
 */
export function scorch(draft: Draft, playerId: PlayerId, tile: TileId): void {
  const flame = draft.blackFlames.find((candidate) => candidate.owner !== playerId && candidate.tile === tile);
  if (!flame || groundSpellsSpare(playerIn(draft, playerId))) return;
  if (playerIn(draft, playerId).spectralArmour > 0) {
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
