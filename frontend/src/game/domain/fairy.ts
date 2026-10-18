import { chargeAbility, ENCHANT_ADVANCE, ENCHANT_FREEZE, ENCHANT_TILES, SNOW_DRAIN, WINTER_TILES } from "./abilities";
import { getTile } from "./board";
import { MAX_ENERGY } from "./cards";
import { playerIn, updatePlayer, walkPath, type Draft } from "./draft";
import { groundSpellsSpare, isUntouchable } from "./players";
import type { PlayerId, TileId, Winter } from "./types";

/** Enchants the harm ahead for good; once none is left ahead, Eternal Winter begins. */
export function bloom(draft: Draft, playerId: PlayerId): void {
  const tiles = harmfulAhead(draft, playerIn(draft, playerId).position, ENCHANT_TILES);
  draft.enchantedTiles = [...draft.enchantedTiles, ...tiles.map((tile) => ({ tile, owner: playerId }))];
  draft.hiddenTraps = draft.hiddenTraps.filter((tile) => !tiles.includes(tile));
  draft.pinnedTraps = draft.pinnedTraps.filter((tile) => !tiles.includes(tile));
  draft.events.push({ type: "tilesEnchanted", playerId, tiles });
  if (!draft.winter && harmfulAhead(draft, playerIn(draft, playerId).position, Infinity).length === 0) {
    draft.winter = { owner: playerId, frontier: draft.state.board.startTile };
    draft.events.push({ type: "winterBegan", playerId });
  }
}

/** Once per round, never freezing the finish itself. */
export function spreadWinter(draft: Draft): void {
  const { winter } = draft;
  const { finishTile } = draft.state.board;
  if (!winter || winter.frontier >= finishTile - 1) return;
  const to = Math.min(finishTile - 1, winter.frontier + WINTER_TILES);
  draft.events.push({ type: "winterSpread", owner: winter.owner, from: winter.frontier + 1, to });
  draft.winter = { ...winter, frontier: to };
}

/** Main path only, never the start or finish. */
function isFrozen(winter: Winter | null, startTile: TileId, tile: TileId): boolean {
  return winter !== null && tile > startTile && tile <= winter.frontier;
}

/** True on frozen tiles, where nothing else happens; the fairy and the Crimson Witch walk the ice untouched. */
export function frostbite(draft: Draft, playerId: PlayerId, tile: TileId): boolean {
  const { winter } = draft;
  if (!winter || !isFrozen(winter, draft.state.board.startTile, tile)) return false;
  const player = playerIn(draft, playerId);
  if (ownSnow(draft, playerId, winter.owner) || groundSpellsSpare(player)) return true;
  if (isUntouchable(player)) {
    draft.events.push({ type: "armourHeld", playerId, tile });
    return true;
  }
  snowIn(draft, playerId, winter.owner, ENCHANT_FREEZE);
  draft.events.push({
    type: "enchantmentStirred",
    playerId,
    owner: winter.owner,
    tile,
    frozen: ENCHANT_FREEZE,
    charged: false,
  });
  return true;
}

/** The first `count` tiles ahead holding harm not yet enchanted. */
function harmfulAhead(draft: Draft, from: TileId, count: number): TileId[] {
  const { board } = draft.state;
  const found: TileId[] = [];
  let tile = getTile(board, from).next;
  while (tile !== null && found.length < count) {
    // Snow can't settle on black fire: fire beats frost.
    const burning = draft.blackFlames.some((flame) => flame.tile === tile);
    if (isHarmful(draft, tile) && !burning && !draft.enchantedTiles.some((enchanted) => enchanted.tile === tile)) {
      found.push(tile);
    }
    tile = getTile(board, tile).next;
  }
  return found;
}

function isHarmful(draft: Draft, tile: TileId): boolean {
  if (draft.hiddenTraps.includes(tile)) return true;
  if (draft.destroyedTraps.includes(tile)) return false;
  const { kind } = getTile(draft.state.board, tile).effect;
  return kind === "trap" || kind === "curse";
}

/** True when the tile is enchanted, so nothing else on it happens; the owner is carried, an opponent snowed in. */
export function stirEnchantment(draft: Draft, playerId: PlayerId, tile: TileId): boolean {
  const enchanted = draft.enchantedTiles.find((candidate) => candidate.tile === tile);
  if (!enchanted) return false;
  const own = ownSnow(draft, playerId, enchanted.owner);
  if (!own && groundSpellsSpare(playerIn(draft, playerId))) return true;

  if (!own && isUntouchable(playerIn(draft, playerId))) {
    draft.events.push({ type: "armourHeld", playerId, tile });
    return true;
  }

  const frozen = own ? 0 : ENCHANT_FREEZE;
  if (!own) snowIn(draft, playerId, enchanted.owner, frozen);
  stir(draft, playerId, enchanted.owner, tile, frozen);
  if (own) carryOnSnow(draft, playerId, tile);
  return true;
}

/** Only stopping on more of their own snow carries them on again; wherever else they stop does nothing. */
function carryOnSnow(draft: Draft, playerId: PlayerId, from: TileId): void {
  let tile = from;
  for (;;) {
    const path = walkPath(draft.state.board, tile, ENCHANT_ADVANCE);
    if (path.length === 0) return;
    draft.events.push({ type: "playerMoved", playerId, path });
    tile = path.at(-1) ?? tile;
    updatePlayer(draft, playerId, () => ({ position: tile }));
    const snow = draft.enchantedTiles.find((enchanted) => enchanted.tile === tile);
    if (!snow || !ownSnow(draft, playerId, snow.owner)) return;
    stir(draft, playerId, snow.owner, tile, 0);
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
  updatePlayer(draft, snowbound.owner, (owner) => ({ energy: Math.min(MAX_ENERGY, owner.energy + taken) }));
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
