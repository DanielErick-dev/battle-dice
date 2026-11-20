import { chargeAbility } from "../../abilities/charge";
import { getTile } from "../../board/board";
import { pushPath, walkPath } from "../../board/paths";
import { isRegularMainTile, isSpellGround } from "../../board/tileGround";
import { handOverCards } from "../../cards/hand";
import { MAX_ENERGY } from "../../core/energy";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { groundSpellsSpare, isUntouchable } from "../../core/playerStatus";
import { ENCHANT_FREEZE, stirEnchantment } from "./snow";
import { frozenTiles, isFrozen, pushFrontier } from "./winter";
import type { Board, TileId } from "../../board/types";
import type { GameState, Player, PlayerId } from "../../core/state";

/** Frost Breath: charge the Fey Bloom gains. */
export const FROST_BREATH_CHARGE = 2;
/** Slippery Track: how far (ahead or behind) an opponent can be from her snow to slide onto it. */
export const SLIDE_REACH = 4;
/** Crystal Wings: how far ahead she looks for her snow to fly to. */
export const WINGS_REACH = 10;
/** Glacial Harvest: energy drained from a snowed-in opponent with no card to take. */
export const HARVEST_DRAIN = 2;
/** Absolute Zero: rounds every opponent is frozen in place, winter's push, and what it snows over without one. */
export const ZERO_FREEZE = ENCHANT_FREEZE;
export const ZERO_WINTER_PUSH = 16;
export const ZERO_TRAPS = 6;
export const ZERO_RANDOM_TILES = 1;

type SnowTable = Pick<GameState, "board" | "enchantedTiles" | "winter" | "blackFlames" | "scarletFlames">;

function snowTable(draft: Draft): SnowTable {
  const { enchantedTiles, winter, blackFlames, scarletFlames } = draft;
  return { board: draft.state.board, enchantedTiles, winter, blackFlames, scarletFlames };
}

/** Her snow and her winter's ice, wherever they lie. */
export function ownSnowTiles(table: SnowTable, fairyId: PlayerId): Set<TileId> {
  const snow = table.enchantedTiles.filter((tile) => tile.owner === fairyId).map((tile) => tile.tile);
  const ice = table.winter?.owner === fairyId ? frozenTiles(table.winter, table.board.startTile) : [];
  return new Set([...snow, ...ice]);
}

/** Frost Breath: the tile she stands on, if snow can settle there (not burning, not snowed or frozen yet). */
export function frostBreathTile(table: SnowTable, fairy: Player): TileId | null {
  const tile = getTile(table.board, fairy.position);
  if (!isSpellGround(tile)) return null;
  const covered =
    table.enchantedTiles.some((enchanted) => enchanted.tile === tile.id) ||
    isFrozen(table.winter, table.board.startTile, tile.id) ||
    table.blackFlames.some((flame) => flame.tile === tile.id) ||
    table.scarletFlames.some((flame) => flame.tile === tile.id);
  return covered ? null : tile.id;
}

export function frostBreath(draft: Draft, playerId: PlayerId): void {
  const tile = frostBreathTile(snowTable(draft), playerIn(draft, playerId));
  if (tile !== null) enchant(draft, playerId, [tile]);
  const before = playerIn(draft, playerId);
  let player = before;
  let becameReady = false;
  for (let step = 0; step < FROST_BREATH_CHARGE; step++) {
    const charged = chargeAbility(player);
    player = charged.player;
    becameReady ||= charged.becameReady;
  }
  updatePlayer(draft, playerId, () => ({ abilityCharge: player.abilityCharge }));
  if (becameReady && player.ability) draft.events.push({ type: "abilityReady", playerId, ability: player.ability });
}

/** Slippery Track: her nearest snow within SLIDE_REACH of the target, ahead or behind; null when none is. */
export function slideTile(table: SnowTable, fairyId: PlayerId, target: Player): TileId | null {
  const own = ownSnowTiles(table, fairyId);
  const ahead = walkPath(table.board, target.position, SLIDE_REACH, target.realmEntry);
  const behind = pushPath(table.board, target.position, SLIDE_REACH, target.realmEntry);
  for (let step = 0; step < SLIDE_REACH; step++) {
    for (const tile of [ahead[step], behind[step]]) if (tile !== undefined && own.has(tile)) return tile;
  }
  return null;
}

/** Slippery Track, after the card's ward and verdict checks: the target slides onto her snow and is snowed in. */
export function slipperyTrack(draft: Draft, playerId: PlayerId, targetId: PlayerId): void {
  const target = playerIn(draft, targetId);
  const tile = slideTile(snowTable(draft), playerId, target);
  if (tile === null) return;
  draft.events.push({ type: "cardTeleported", playerId: targetId, from: target.position, to: tile });
  updatePlayer(draft, targetId, () => ({ position: tile, realmEntry: null }));
  stirEnchantment(draft, targetId, tile);
}

/** Crystal Wings: her first snow ahead within WINGS_REACH; null when there's none. */
export function wingsTile(table: SnowTable, fairy: Player): TileId | null {
  const own = ownSnowTiles(table, fairy.id);
  return walkPath(table.board, fairy.position, WINGS_REACH, fairy.realmEntry).find((tile) => own.has(tile)) ?? null;
}

/** Crystal Wings: she flies onto that snow and it carries her on, as if her roll had stopped there. */
export function crystalWings(draft: Draft, playerId: PlayerId): void {
  const fairy = playerIn(draft, playerId);
  const tile = wingsTile(snowTable(draft), fairy);
  if (tile === null) return;
  draft.events.push({ type: "cardTeleported", playerId, from: fairy.position, to: tile });
  updatePlayer(draft, playerId, () => ({ position: tile }));
  stirEnchantment(draft, playerId, tile);
}

/** Opponents stuck in snow or ice right now that a card can reach (protected ones can't be touched). */
export function snowboundOpponents(players: readonly Player[], fairyId: PlayerId): Player[] {
  return players.filter((player) => player.id !== fairyId && player.snowbound !== null && !isUntouchable(player));
}

/** Glacial Harvest: a random card from each one stuck in the snow; from an empty hand, HARVEST_DRAIN energy instead. */
export function glacialHarvest(draft: Draft, playerId: PlayerId): void {
  for (const victim of snowboundOpponents(draft.players, playerId)) {
    const { hand } = playerIn(draft, victim.id);
    if (hand.length > 0) {
      const card = hand[Math.floor(draft.random() * hand.length)];
      if (card) handOverCards(draft, victim.id, playerId, [card]);
      continue;
    }
    const taken = Math.min(HARVEST_DRAIN, victim.energy);
    if (taken === 0) continue;
    updatePlayer(draft, victim.id, (player) => ({ energy: player.energy - taken }));
    updatePlayer(draft, playerId, (player) => ({ energy: Math.min(MAX_ENERGY, player.energy + taken) }));
    draft.events.push({ type: "snowDrained", playerId: victim.id, owner: playerId, energy: taken });
  }
}

/**
 * Absolute Zero: every opponent frozen where they stand for ZERO_FREEZE rounds (drained like in her snow), then the
 * land: with Eternal Winter on, its ice pushes ZERO_WINTER_PUSH tiles past where it had reached; without it, the
 * ZERO_TRAPS nearest harms and ZERO_RANDOM_TILES random tile of the path go under her snow for good.
 */
export function absoluteZero(draft: Draft, playerId: PlayerId): void {
  const frozen: PlayerId[] = [];
  for (const victim of draft.players) {
    if (victim.id === playerId) continue;
    if (isUntouchable(victim)) {
      draft.events.push({ type: "armourHeld", playerId: victim.id, tile: victim.position });
      continue;
    }
    // The Crimson Witch floats over the frost.
    if (groundSpellsSpare(victim)) continue;
    updatePlayer(draft, victim.id, (player) => ({
      skipTurns: player.skipTurns + ZERO_FREEZE,
      snowbound: { owner: playerId, rounds: Math.max(ZERO_FREEZE, player.snowbound?.rounds ?? 0) },
    }));
    frozen.push(victim.id);
  }
  draft.events.push({ type: "absoluteZero", playerId, frozen, rounds: ZERO_FREEZE });

  if (draft.winter) {
    pushFrontier(draft, ZERO_WINTER_PUSH);
    return;
  }
  const { board } = draft.state;
  const fairy = playerIn(draft, playerId);
  const traps = coverableTiles(draft, board, (tile) => isHarm(draft, tile))
    .sort((a, b) => Math.abs(a - fairy.position) - Math.abs(b - fairy.position))
    .slice(0, ZERO_TRAPS);
  const plain = coverableTiles(draft, board, (tile) => isRegularMainTile(getTile(board, tile))).filter(
    (tile) => !traps.includes(tile),
  );
  const random: TileId[] = [];
  for (let pick = 0; pick < ZERO_RANDOM_TILES && plain.length > 0; pick++) {
    random.push(...plain.splice(Math.floor(draft.random() * plain.length), 1));
  }
  enchant(draft, playerId, [...traps, ...random]);
}

/** Main-path tiles snow can settle on that pass `test`: not snowed, frozen or burning, never the start or finish. */
function coverableTiles(draft: Draft, board: Board, test: (tile: TileId) => boolean): TileId[] {
  return board.tiles
    .filter((tile) => !tile.track && tile.role !== "start" && tile.role !== "finish" && test(tile.id))
    .map(({ id }) => id)
    .filter(
      (tile) =>
        !draft.enchantedTiles.some((enchanted) => enchanted.tile === tile) &&
        !isFrozen(draft.winter, board.startTile, tile) &&
        !draft.blackFlames.some((flame) => flame.tile === tile) &&
        !draft.scarletFlames.some((flame) => flame.tile === tile),
    );
}

function isHarm(draft: Draft, tile: TileId): boolean {
  if (draft.hiddenTraps.includes(tile)) return true;
  if (draft.destroyedTraps.includes(tile)) return false;
  const { kind } = getTile(draft.state.board, tile).effect;
  return kind === "trap" || kind === "curse";
}

/** Her snow settles on `tiles` for good: a hidden trap there is gone, an arrow-pinned one freed. */
function enchant(draft: Draft, playerId: PlayerId, tiles: readonly TileId[]): void {
  if (tiles.length === 0) return;
  draft.enchantedTiles = [...draft.enchantedTiles, ...tiles.map((tile) => ({ tile, owner: playerId }))];
  draft.hiddenTraps = draft.hiddenTraps.filter((tile) => !tiles.includes(tile));
  draft.pinnedTraps = draft.pinnedTraps.filter((tile) => !tiles.includes(tile));
  draft.events.push({ type: "tilesEnchanted", playerId, tiles: [...tiles] });
}
