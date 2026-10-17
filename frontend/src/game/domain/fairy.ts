import { chargeAbility, ENCHANT_ADVANCE, ENCHANT_FREEZE, ENCHANT_TILES, SNOW_DRAIN, WINTER_TILES } from "./abilities";
import { getTile } from "./board";
import { MAX_ENERGY } from "./cards";
import { playerIn, updatePlayer, walkPath, type Draft } from "./draft";
import { groundSpellsSpare, isUntouchable } from "./players";
import type { PlayerId, TileId, Winter } from "./types";

/**
 * Fairy Bloom: the next ENCHANT_TILES harmful tiles ahead of the player (a trap or a curse not
 * smashed yet, a hidden trap; pinned ones too) are enchanted for good. Their harm is gone: a hidden
 * trap among them vanishes, a pinned one is freed of its arrows. Once no harm is left ahead of her,
 * her Eternal Winter begins (see spreadWinter).
 */
export function bloom(draft: Draft, playerId: PlayerId): void {
  const tiles = harmfulAhead(draft, playerIn(draft, playerId).position, ENCHANT_TILES);
  draft.enchantedTiles = [...draft.enchantedTiles, ...tiles.map((tile) => ({ tile, owner: playerId }))];
  draft.hiddenTraps = draft.hiddenTraps.filter((tile) => !tiles.includes(tile));
  draft.pinnedTraps = draft.pinnedTraps.filter((tile) => !tiles.includes(tile));
  draft.events.push({ type: "tilesEnchanted", playerId, tiles });
  // Nothing harmful left ahead to snow: Eternal Winter sets in.
  if (!draft.winter && harmfulAhead(draft, playerIn(draft, playerId).position, Infinity).length === 0) {
    draft.winter = { owner: playerId, frontier: draft.state.board.startTile };
    draft.events.push({ type: "winterBegan", playerId });
  }
}

/**
 * A round went by: Eternal Winter freezes the next WINTER_TILES tiles of the main path, from the
 * start toward the finish (never the finish itself).
 */
export function spreadWinter(draft: Draft): void {
  const { winter } = draft;
  const { finishTile } = draft.state.board;
  if (!winter || winter.frontier >= finishTile - 1) return;
  const to = Math.min(finishTile - 1, winter.frontier + WINTER_TILES);
  draft.events.push({
    type: "winterSpread",
    owner: winter.owner,
    from: winter.frontier + 1,
    to,
  });
  draft.winter = { ...winter, frontier: to };
}

/** Whether Eternal Winter has frozen `tile` (main path only, start and finish never). */
export function isFrozen(winter: Winter | null, startTile: TileId, tile: TileId): boolean {
  return winter !== null && tile > startTile && tile <= winter.frontier;
}

/**
 * The player stopped on a tile Eternal Winter froze (true): nothing on it happens. Its fairy walks
 * the ice untouched (so does the Crimson Witch, see groundSpellsSpare); anyone else is stuck in it
 * for ENCHANT_FREEZE rounds, like in her snow, unless Spectral Armour or Untamed turn it away.
 */
export function frostbite(draft: Draft, playerId: PlayerId, tile: TileId): boolean {
  const { winter } = draft;
  if (!winter || !isFrozen(winter, draft.state.board.startTile, tile)) return false;
  const player = playerIn(draft, playerId);
  if (ownSnow(draft, playerId, winter.owner) || groundSpellsSpare(player)) return true;
  if (isUntouchable(player)) {
    draft.events.push({ type: "armourHeld", playerId, tile });
    return true;
  }
  updatePlayer(draft, playerId, (current) => ({
    skipTurns: current.skipTurns + ENCHANT_FREEZE,
    snowbound: {
      owner: winter.owner,
      rounds: Math.max(ENCHANT_FREEZE, current.snowbound?.rounds ?? 0),
    },
  }));
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

/** The first `count` tiles ahead (following `next`) holding harm that isn't enchanted yet. */
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

/**
 * The player stopped on `tile`: an enchanted tile stirs (true), and nothing else on it happens.
 * Its owner (or anyone alone on the board) is carried ENCHANT_ADVANCE tiles ahead, on and on while
 * they stop on more of their snow (see carryOnSnow); an opponent is
 * stuck in the snow for ENCHANT_FREEZE rounds, unless Spectral Armour turns it away. Either way the
 * owner's ability gains a turn of charge. The Crimson Witch isn't touched by the frost at all (see
 * groundSpellsSpare): the tile just does nothing to her.
 */
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
  if (!own) {
    updatePlayer(draft, playerId, (player) => ({
      skipTurns: player.skipTurns + frozen,
      snowbound: {
        owner: enchanted.owner,
        rounds: Math.max(frozen, player.snowbound?.rounds ?? 0),
      },
    }));
  }
  stir(draft, playerId, enchanted.owner, tile, frozen);
  if (own) carryOnSnow(draft, playerId, tile);
  return true;
}

/**
 * The snow carries the player ENCHANT_ADVANCE tiles on from `from`. Stopping on more of their own
 * snow carries them on again (walking over it never counts, only stopping on it); stopping anywhere
 * else, nothing happens there.
 */
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

/**
 * A turn the player lost while stuck in the snow: it drains 1 of their energy into the fairy who owns
 * it (what doesn't fit her bar is lost), and the snow is a round closer to letting go.
 */
export function drainSnow(draft: Draft, playerId: PlayerId): void {
  const { snowbound, energy } = playerIn(draft, playerId);
  if (!snowbound) return;
  const taken = Math.min(SNOW_DRAIN, energy);
  updatePlayer(draft, playerId, (player) => ({
    energy: player.energy - taken,
    snowbound: snowbound.rounds > 1 ? { ...snowbound, rounds: snowbound.rounds - 1 } : null,
  }));
  updatePlayer(draft, snowbound.owner, (owner) => ({
    energy: Math.min(MAX_ENERGY, owner.energy + taken),
  }));
  draft.events.push({
    type: "snowDrained",
    playerId,
    owner: snowbound.owner,
    energy: taken,
  });
}

function ownSnow(draft: Draft, playerId: PlayerId, owner: PlayerId): boolean {
  return owner === playerId || draft.players.length === 1;
}

/** The snow on `tile` stirred under `playerId`: its owner's ability gains a turn of charge. */
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
