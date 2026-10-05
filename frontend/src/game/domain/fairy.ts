import { chargeAbility, ENCHANT_ADVANCE, ENCHANT_FREEZE, ENCHANT_TILES } from "./abilities";
import { getTile } from "./board";
import { playerIn, updatePlayer, walkPath, type Draft } from "./draft";
import { groundSpellsSpare } from "./players";
import type { PlayerId, TileId } from "./types";

/**
 * Fairy Bloom: the next ENCHANT_TILES harmful tiles ahead of the player (a trap or a curse not
 * smashed yet, a hidden trap; pinned ones too) are enchanted for good. Their harm is gone: a hidden
 * trap among them vanishes, a pinned one is freed of its arrows.
 */
export function bloom(draft: Draft, playerId: PlayerId): void {
  const tiles = harmfulAhead(draft, playerIn(draft, playerId).position, ENCHANT_TILES);
  draft.enchantedTiles = [...draft.enchantedTiles, ...tiles.map((tile) => ({ tile, owner: playerId }))];
  draft.hiddenTraps = draft.hiddenTraps.filter((tile) => !tiles.includes(tile));
  draft.pinnedTraps = draft.pinnedTraps.filter((tile) => !tiles.includes(tile));
  draft.events.push({ type: "tilesEnchanted", playerId, tiles });
}

/** The first `count` tiles ahead (following `next`) holding harm that isn't enchanted yet. */
function harmfulAhead(draft: Draft, from: TileId, count: number): TileId[] {
  const { board } = draft.state;
  const found: TileId[] = [];
  let tile = getTile(board, from).next;
  while (tile !== null && found.length < count) {
    if (isHarmful(draft, tile) && !draft.enchantedTiles.some((enchanted) => enchanted.tile === tile)) found.push(tile);
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
 * Its owner (or anyone alone on the board) is carried ENCHANT_ADVANCE tiles ahead; an opponent is
 * stuck in the snow for ENCHANT_FREEZE rounds, unless Spectral Armour turns it away. Either way the
 * owner's ability gains a turn of charge. The Crimson Witch isn't touched by the frost at all (see
 * groundSpellsSpare): the tile just does nothing to her.
 */
export function stirEnchantment(draft: Draft, playerId: PlayerId, tile: TileId): boolean {
  const enchanted = draft.enchantedTiles.find((candidate) => candidate.tile === tile);
  if (!enchanted) return false;
  const own = ownSnow(draft, playerId, enchanted.owner);
  if (!own && groundSpellsSpare(playerIn(draft, playerId))) return true;

  if (!own && playerIn(draft, playerId).spectralArmour > 0) {
    draft.events.push({ type: "armourHeld", playerId, tile });
    return true;
  }

  const frozen = own ? 0 : ENCHANT_FREEZE;
  if (!own) updatePlayer(draft, playerId, (player) => ({ skipTurns: player.skipTurns + frozen }));
  stir(draft, playerId, enchanted.owner, tile, frozen);
  if (own) {
    const path = walkPath(draft.state.board, tile, ENCHANT_ADVANCE);
    if (path.length > 0) {
      draft.events.push({ type: "playerMoved", playerId, path });
      updatePlayer(draft, playerId, () => ({ position: path.at(-1) ?? tile }));
    }
  }
  return true;
}

/**
 * The fairy (or anyone alone on the board) walked over their own snow on `path`, short of its last
 * tile (stopping there is stirEnchantment's): the snow carries them ENCHANT_ADVANCE tiles further,
 * once per walk. Returns that glide's path (empty without one); the caller lands them at its end.
 */
export function glideOverSnow(draft: Draft, playerId: PlayerId, path: readonly TileId[]): TileId[] {
  const crossed = path
    .slice(0, -1)
    .map((tile) => draft.enchantedTiles.find((enchanted) => enchanted.tile === tile))
    .find((enchanted) => enchanted && ownSnow(draft, playerId, enchanted.owner));
  const end = path.at(-1);
  if (!crossed || end === undefined) return [];
  stir(draft, playerId, crossed.owner, crossed.tile, 0);
  const glide = walkPath(draft.state.board, end, ENCHANT_ADVANCE);
  if (glide.length > 0) {
    draft.events.push({ type: "playerMoved", playerId, path: glide });
    updatePlayer(draft, playerId, () => ({ position: glide.at(-1) ?? end }));
  }
  return glide;
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
