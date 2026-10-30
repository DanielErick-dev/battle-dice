import { PLASMA_PUSH, PLASMA_TRAPS, SERAPH_CARD_CHANCE, TIDE_RANGE, TIME_ROUNDS, type AbilityPower } from "./abilities";
import { DIVINE_CARDS } from "./cards";
import { GameRuleError } from "./commands";
import { getTile, opponentsInReach, opponentsInSpace } from "./board";
import { giveCard, playerIn, pushPath, updatePlayer, type Draft } from "./draft";
import { grantBlessing, TIMED_BLESSINGS } from "./blessings";
import { relocateHiddenTrap } from "./hiddenTraps";
import { aimWard } from "./players";
import { passVerdict, verdictArmed } from "./verdict";
import type { Board, Player, PlayerId, TileId } from "./types";

/** The player's tile plus the TIDE_RANGE tiles ahead. */
function tideReach(board: Board, from: TileId): TileId[] {
  const tiles = [from];
  let tile = getTile(board, from).next;
  while (tile !== null && tiles.length <= TIDE_RANGE) {
    tiles.push(tile);
    tile = getTile(board, tile).next;
  }
  return tiles;
}

/** Sweeps every spell, whoever cast it; a freed hidden trap moves, as when walked past. */
export function cleansingTide(draft: Draft, playerId: PlayerId): void {
  const path = tideReach(draft.state.board, playerIn(draft, playerId).position);
  const reach = new Set(path);
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
  draft.events.push({ type: "boardCleansed", playerId, reach: path, tiles: [...new Set(tiles)] });
}

/** A random timed blessing or heaven card. */
export function seraphBlessing(draft: Draft, playerId: PlayerId): void {
  if (draft.random() < SERAPH_CARD_CHANCE) {
    giveCard(draft, playerId, {
      uid: `${playerId}:grace${draft.state.turn}`,
      cardId: DIVINE_CARDS[Math.floor(draft.random() * DIVINE_CARDS.length)],
    });
    return;
  }
  const blessing = TIMED_BLESSINGS[Math.floor(draft.random() * TIMED_BLESSINGS.length)];
  grantBlessing(draft, playerId, blessing);
  draft.events.push({
    type: "blessingReceived",
    playerId,
    blessing,
    tile: playerIn(draft, playerId).position,
    energyGained: 0,
  });
}

/** From heaven Cronos can't reach the board; armoured ones are listed and turn it away. */
export function timeTargets(board: Board, players: readonly Player[], playerId: PlayerId): Player[] {
  return opponentsInSpace(board, players, playerId);
}

/** Stacks with what the target already had; with nobody to aim at, the player gets an extra turn instead. */
export function timeWarp(draft: Draft, playerId: PlayerId, power?: AbilityPower, targetId?: PlayerId): void {
  const targets = timeTargets(draft.state.board, draft.players, playerId);
  if (targets.length === 0) {
    draft.extraTurn = true;
    draft.events.push({ type: "extraTurnGranted", playerId, tile: playerIn(draft, playerId).position });
    return;
  }
  const target = targets.find((candidate) => candidate.id === targetId);
  if (!target || (power !== "halt" && power !== "reverse")) throw new GameRuleError("INVALID_TARGET");
  const ward = aimWard(target);
  if (ward) {
    draft.events.push({ type: "abilityBlocked", playerId, targetId: target.id, ability: "timeWarp", ward });
    return;
  }
  // Themis's verdict bends Cronos's own time instead.
  if (verdictArmed(target)) {
    passVerdict(draft, target.id, playerId, { ability: "timeWarp" });
    bendTime(draft, target.id, playerId, power);
    return;
  }
  bendTime(draft, playerId, target.id, power);
  // The gears only start winding again once the bent rounds have gone by.
  updatePlayer(draft, playerId, () => ({ chargeHeld: TIME_ROUNDS }));
}

function bendTime(draft: Draft, playerId: PlayerId, targetId: PlayerId, power: "halt" | "reverse"): void {
  updatePlayer(draft, targetId, (player) =>
    power === "halt"
      ? { skipTurns: player.skipTurns + TIME_ROUNDS }
      : { reversedRolls: player.reversedRolls + TIME_ROUNDS },
  );
  draft.events.push({ type: "timeBent", playerId, targetId, power, rounds: TIME_ROUNDS });
}

/** Also knocks back the opponent in reach furthest ahead. */
export function plasmaCannon(draft: Draft, playerId: PlayerId): void {
  const { board } = draft.state;
  blastTrapsAhead(draft, playerId, PLASMA_TRAPS);

  const [leader] = opponentsInReach(board, draft.players, playerId).sort((a, b) => b.position - a.position);
  if (!leader) return;
  const path = pushPath(board, leader.position, PLASMA_PUSH, leader.realmEntry);
  draft.events.push({ type: "playerPushed", playerId: leader.id, by: playerId, path });
  updatePlayer(draft, leader.id, () => ({ position: path.at(-1) ?? leader.position }));
}

/** Hidden ones too, but not curses. */
export function blastTrapsAhead(draft: Draft, playerId: PlayerId, count: number): void {
  const { board } = draft.state;
  const blasted: TileId[] = [];
  let tile = getTile(board, playerIn(draft, playerId).position).next;
  while (tile !== null && blasted.length < count) {
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
}
