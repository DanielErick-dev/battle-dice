import { chargeAbility } from "../../abilities/charge";
import { getTile, mainTileOf } from "../../board/board";
import { pushPath, walkPath } from "../../board/paths";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { groundSpellsSpare, inSusanoo, isUntouchable } from "../../core/playerStatus";
import { advance } from "../themis/cards";
import { clipAtWalls } from "../tenzai/elements";
import { ARMOUR_TURNS, flammableTiles, kindle, scorch, unburnableTiles } from "./flames";
import type { Board, TileId } from "../../board/types";
import type { Player, PlayerId } from "../../core/state";
import type { BlackFlame } from "./types";

/** Tear of Blood: charge the Ocular Awakening gains. */
export const BLOOD_TEAR_CHARGE = 2;
/** Scarlet Mirage: how far (ahead or behind) an opponent can be from her fire to be pulled onto it. */
export const MIRAGE_REACH = 6;
/** Amaterasu's Breeze: rounds and scorches every black fire gains, and tiles she walks per fire. */
export const BREEZE_TURNS = 5;
export const BREEZE_BURNS = 2;
export const BREEZE_STEP = 2;
/** Susanoo's Sword: the walk, and with the Susanoo already up the long walk and the push on whoever she passes. */
export const SWORD_STEP = 4;
export const SWORD_SUSANOO_STEP = 8;
export const SWORD_PUSH = 5;
/** "1 round": her own turns counting the one it's raised on, so it lasts until her next turn. */
export const SWORD_SUSANOO_TURNS = 2;
/** Eternal Eclipse: fires lit ahead of each opponent, the closest this many tiles ahead, and how many are hypnotised. */
export const ECLIPSE_FIRES = 2;
export const ECLIPSE_GAP = 2;
export const ECLIPSE_HYPNOSIS = 2;

/** Tear of Blood: +BLOOD_TEAR_CHARGE on her ability and a black fire on the nearest tile behind her that can burn. */
export function bloodTear(draft: Draft, playerId: PlayerId): void {
  const before = playerIn(draft, playerId);
  let player = before;
  let becameReady = false;
  for (let step = 0; step < BLOOD_TEAR_CHARGE; step++) {
    const charged = chargeAbility(player);
    player = charged.player;
    becameReady ||= charged.becameReady;
  }
  updatePlayer(draft, playerId, () => ({ abilityCharge: player.abilityCharge }));
  if (becameReady && player.ability) draft.events.push({ type: "abilityReady", playerId, ability: player.ability });

  const { board } = draft.state;
  const allowed = new Set(flammableTiles(board, before.position, unburnableTiles(draft)));
  const behind = pushPath(board, before.position, board.tiles.length, before.realmEntry).find((tile) =>
    allowed.has(tile),
  );
  if (behind !== undefined) kindle(draft, playerId, [behind]);
}

/** Scarlet Mirage: her nearest fire within MIRAGE_REACH of the target, ahead or behind; null when none is. */
export function mirageFire(
  board: Board,
  blackFlames: readonly BlackFlame[],
  ownerId: PlayerId,
  target: Player,
): TileId | null {
  const own = new Set(blackFlames.filter((flame) => flame.owner === ownerId).map((flame) => flame.tile));
  const ahead = walkPath(board, target.position, MIRAGE_REACH, target.realmEntry);
  const behind = pushPath(board, target.position, MIRAGE_REACH, target.realmEntry);
  for (let step = 0; step < MIRAGE_REACH; step++) {
    for (const tile of [ahead[step], behind[step]]) if (tile !== undefined && own.has(tile)) return tile;
  }
  return null;
}

/** Scarlet Mirage, after the card's ward and verdict checks: the target is pulled onto her fire and burns. */
export function scarletMirage(draft: Draft, playerId: PlayerId, targetId: PlayerId): void {
  const fire = mirageFire(draft.state.board, draft.blackFlames, playerId, playerIn(draft, targetId));
  if (fire !== null) pullIntoFire(draft, targetId, fire);
}

/** Amaterasu's Breeze: every black fire gains rounds and scorches and spreads one tile ahead; she walks per fire. */
export function amaterasuBreeze(draft: Draft, playerId: PlayerId): void {
  const renewed = draft.blackFlames.map((flame) => flame.tile);
  draft.blackFlames = draft.blackFlames.map((flame) => ({
    ...flame,
    turnsLeft: flame.turnsLeft + BREEZE_TURNS,
    burnsLeft: flame.burnsLeft + BREEZE_BURNS,
  }));
  draft.events.push({ type: "flamesRenewed", playerId, tiles: renewed, turns: BREEZE_TURNS, burns: BREEZE_BURNS });

  const { board } = draft.state;
  for (const flame of [...draft.blackFlames]) {
    const allowed = new Set(flammableTiles(board, flame.tile, unburnableTiles(draft)));
    // The next tile ahead that can burn: a special tile right in front is skipped, not a dead end.
    const spread = walkPath(board, flame.tile, board.tiles.length).find((tile) => allowed.has(tile));
    if (spread !== undefined) kindle(draft, flame.owner, [spread]);
  }
  const tiles = draft.blackFlames.length * BREEZE_STEP;
  if (tiles > 0) advance(draft, playerId, tiles);
}

/** Susanoo's Sword: a walk and a short Susanoo; with one already up, a longer walk that throws back whoever she passes. */
export function susanooSword(draft: Draft, playerId: PlayerId): void {
  const self = playerIn(draft, playerId);
  if (!inSusanoo(self)) {
    advance(draft, playerId, SWORD_STEP);
    raiseSusanoo(draft, playerId, SWORD_SUSANOO_TURNS);
    return;
  }
  const { board } = draft.state;
  const { path } = clipAtWalls(draft, playerId, walkPath(board, self.position, SWORD_SUSANOO_STEP, self.realmEntry));
  // Whoever stands where she stops is swept by the Susanoo itself (sweptBySusanoo), not by the sword.
  const passed = new Set(path.slice(0, -1));
  const struck = draft.players.filter(
    (other) => other.id !== playerId && passed.has(other.position) && !isUntouchable(other),
  );
  advance(draft, playerId, SWORD_SUSANOO_STEP);
  for (const target of struck) {
    const current = playerIn(draft, target.id);
    const pushed = pushPath(board, current.position, SWORD_PUSH, current.realmEntry);
    draft.events.push({ type: "playerPushed", playerId: target.id, by: playerId, path: pushed });
    updatePlayer(draft, target.id, () => ({ position: pushed.at(-1) ?? current.position }));
  }
}

/** Eternal Eclipse: a long Susanoo, two fires ahead of every opponent, and the leaders walked into theirs. */
export function eternalEclipse(draft: Draft, playerId: PlayerId): void {
  raiseSusanoo(draft, playerId, ARMOUR_TURNS);
  const { board } = draft.state;
  const opponents = draft.players.filter((player) => player.id !== playerId && onMainPath(board, player));

  for (const opponent of opponents) {
    const allowed = new Set(flammableTiles(board, opponent.position, unburnableTiles(draft)));
    const tiles = walkPath(board, opponent.position, board.tiles.length)
      .slice(ECLIPSE_GAP - 1)
      .filter((tile) => allowed.has(tile))
      .slice(0, ECLIPSE_FIRES);
    kindle(draft, playerId, tiles);
  }

  const progress = (player: Player) => mainTileOf(board, player.position, player.realmEntry);
  const leaders = [...opponents].sort((a, b) => progress(b) - progress(a)).slice(0, ECLIPSE_HYPNOSIS);
  for (const leader of leaders) {
    const victim = playerIn(draft, leader.id);
    const ahead = walkPath(board, victim.position, board.tiles.length);
    const fire = ahead.find((tile) => draft.blackFlames.some((f) => f.owner === playerId && f.tile === tile));
    if (fire === undefined) continue;
    // Armour keeps the trance out; only the Susanoo lets fire through (see scorch).
    if (isUntouchable(victim) && !inSusanoo(victim)) {
      draft.events.push({ type: "armourHeld", playerId: victim.id, tile: fire });
      continue;
    }
    pullIntoFire(draft, victim.id, fire);
  }
}

/** Moved straight onto the fire, which burns them as if they had stopped there; those it spares aren't moved. */
function pullIntoFire(draft: Draft, victimId: PlayerId, tile: TileId): void {
  const victim = playerIn(draft, victimId);
  if (groundSpellsSpare(victim) || victim.ability === "ocularAwakening") return;
  draft.events.push({ type: "cardTeleported", playerId: victimId, from: victim.position, to: tile });
  updatePlayer(draft, victimId, () => ({ position: tile, realmEntry: null }));
  scorch(draft, victimId, tile);
}

function raiseSusanoo(draft: Draft, playerId: PlayerId, turns: number): void {
  const longest = Math.max(playerIn(draft, playerId).spectralArmour, turns);
  updatePlayer(draft, playerId, () => ({ spectralArmour: longest }));
  draft.events.push({ type: "armourRaised", playerId, turns: longest });
}

function onMainPath(board: Board, player: Player): boolean {
  return !getTile(board, player.position).track;
}
