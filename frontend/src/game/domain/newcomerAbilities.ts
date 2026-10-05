import { ARMOUR_TURNS, PLASMA_PUSH, PLASMA_TRAPS, TIDE_RANGE, TIME_ROUNDS, type AbilityPower } from "./abilities";
import { GameRuleError } from "./commands";
import { getTile, opponentsInReach } from "./board";
import { playerIn, pushPath, updatePlayer, type Draft } from "./draft";
import { grantBlessing } from "./blessings";
import { relocateHiddenTrap } from "./hiddenTraps";
import type { Board, Player, PlayerId, TileId, TimedBlessing } from "./types";

/** Heaven's blessings the Seraph Guardian may call down, one at random. */
const SERAPH_BLESSINGS: readonly TimedBlessing[] = ["wings", "halo", "inspiration", "spring"];

/** The player's tile and the TIDE_RANGE tiles ahead of it (following `next`): what Cleansing Tide sweeps. */
export function tideReach(board: Board, from: TileId): TileId[] {
  const tiles = [from];
  let tile = getTile(board, from).next;
  while (tile !== null && tiles.length <= TIDE_RANGE) {
    tiles.push(tile);
    tile = getTile(board, tile).next;
  }
  return tiles;
}

/**
 * Cleansing Tide: a wave rolls ahead of the player over TIDE_RANGE tiles and sweeps them clean of
 * every spell lying there, whoever cast it: black fire, the fairy's snow, apparitions, seals and
 * the arrows pinning traps down (a freed hidden trap moves elsewhere in its zone, as when walked past).
 */
export function cleansingTide(draft: Draft, playerId: PlayerId): void {
  const reach = new Set(tideReach(draft.state.board, playerIn(draft, playerId).position));
  const swept = (tile: TileId) => reach.has(tile);
  const tiles = [
    ...draft.blackFlames.map((flame) => flame.tile),
    ...draft.enchantedTiles.map((enchanted) => enchanted.tile),
    ...draft.specters.map((specter) => specter.tile),
    ...draft.seals.map((seal) => seal.tile),
    ...draft.pinnedTraps,
  ].filter(swept);
  for (const tile of draft.pinnedTraps.filter(swept)) {
    if (!draft.hiddenTraps.includes(tile)) continue;
    draft.hiddenTraps = relocateHiddenTrap(draft.state.board, draft.hiddenTraps, tile, draft.random, [
      ...draft.destroyedTraps,
    ]);
  }
  draft.blackFlames = draft.blackFlames.filter((flame) => !swept(flame.tile));
  draft.enchantedTiles = draft.enchantedTiles.filter((enchanted) => !swept(enchanted.tile));
  draft.specters = draft.specters.filter((specter) => !swept(specter.tile));
  draft.seals = draft.seals.filter((seal) => !swept(seal.tile));
  draft.pinnedTraps = draft.pinnedTraps.filter((tile) => !swept(tile));
  draft.events.push({ type: "boardCleansed", playerId, tiles: [...new Set(tiles)] });
}

/**
 * Glacial Howl: every opponent in reach (not under Spectral Armour) is frozen where they stand and
 * loses their next turn. Alone on the board there's nobody to freeze: the roll walks further instead
 * (see rollBonus).
 */
export function glacialHowl(draft: Draft, playerId: PlayerId): void {
  const targets = opponentsInReach(draft.state.board, draft.players, playerId);
  for (const target of targets) updatePlayer(draft, target.id, (player) => ({ skipTurns: player.skipTurns + 1 }));
  draft.events.push({ type: "opponentsFrozen", playerId, targets: targets.map((target) => target.id) });
}

/** Sacred Bulwark: the Arcane Shield goes up, and Spectral Armour for ARMOUR_TURNS of their turns. */
export function sacredBulwark(draft: Draft, playerId: PlayerId): void {
  updatePlayer(draft, playerId, () => ({ shielded: true, spectralArmour: ARMOUR_TURNS }));
  draft.events.push({ type: "armourRaised", playerId, turns: ARMOUR_TURNS });
}

/** Seraph's Blessing: one of heaven's timed blessings, at random, lands on the player. */
export function seraphBlessing(draft: Draft, playerId: PlayerId): void {
  const blessing = SERAPH_BLESSINGS[Math.floor(draft.random() * SERAPH_BLESSINGS.length)];
  grantBlessing(draft, playerId, blessing);
  draft.events.push({
    type: "blessingReceived",
    playerId,
    blessing,
    tile: playerIn(draft, playerId).position,
    energyGained: 0,
  });
}

/** The opponents Time Warp can bend the time of: all of them, wherever they are, but those under Spectral Armour. */
export function timeTargets(players: readonly Player[], playerId: PlayerId): Player[] {
  return players.filter((player) => player.id !== playerId && player.spectralArmour === 0);
}

/**
 * Time Warp: the player bends the chosen opponent's time. Halted, they lose their next TIME_ROUNDS
 * turns; reversed, their next TIME_ROUNDS rolls walk them backwards. With nobody to aim at (alone,
 * or every opponent armoured) the gears turn back for the player instead: they play again once
 * this turn is over.
 */
export function timeWarp(draft: Draft, playerId: PlayerId, power?: AbilityPower, targetId?: PlayerId): void {
  const targets = timeTargets(draft.players, playerId);
  if (targets.length === 0) {
    draft.extraTurn = true;
    draft.events.push({ type: "extraTurnGranted", playerId, tile: playerIn(draft, playerId).position });
    return;
  }
  const target = targets.find((candidate) => candidate.id === targetId);
  if (!target || (power !== "halt" && power !== "reverse")) throw new GameRuleError("INVALID_TARGET");
  updatePlayer(draft, target.id, (player) =>
    power === "halt"
      ? { skipTurns: player.skipTurns + TIME_ROUNDS }
      : { reversedRolls: Math.max(player.reversedRolls, TIME_ROUNDS) },
  );
  draft.events.push({ type: "timeBent", playerId, targetId: target.id, power, rounds: TIME_ROUNDS });
}

/**
 * Plasma Cannon: the next PLASMA_TRAPS traps ahead (hidden ones too; not curses) are blasted away
 * for good, and the opponent in reach furthest ahead is knocked back PLASMA_PUSH tiles.
 */
export function plasmaCannon(draft: Draft, playerId: PlayerId): void {
  const { board } = draft.state;
  const blasted: TileId[] = [];
  let tile = getTile(board, playerIn(draft, playerId).position).next;
  while (tile !== null && blasted.length < PLASMA_TRAPS) {
    const hidden = draft.hiddenTraps.includes(tile);
    if (hidden || (getTile(board, tile).effect.kind === "trap" && !draft.destroyedTraps.includes(tile))) {
      blasted.push(tile);
      draft.destroyedTraps = [...draft.destroyedTraps, tile];
      draft.hiddenTraps = draft.hiddenTraps.filter((candidate) => candidate !== tile);
      draft.pinnedTraps = draft.pinnedTraps.filter((candidate) => candidate !== tile);
      draft.events.push({ type: "trapDestroyed", playerId, tile, hidden });
    }
    tile = getTile(board, tile).next;
  }

  const [leader] = opponentsInReach(board, draft.players, playerId).sort((a, b) => b.position - a.position);
  if (!leader) return;
  const path = pushPath(board, leader.position, PLASMA_PUSH);
  draft.events.push({ type: "playerPushed", playerId: leader.id, by: playerId, path });
  updatePlayer(draft, leader.id, () => ({ position: path.at(-1) ?? leader.position }));
}
