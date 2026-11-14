import { mainTileOf } from "../../board/board";
import { pushPath, walkPath } from "../../board/paths";
import { opponentsInSpace } from "../../board/reach";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { aimWard, isUntouchable } from "../../core/playerStatus";
import { advance, distanceBetween } from "../themis/cards";
import { judgeAim } from "../themis/verdict";
import { isBurning, lightScarlet, quench, setAblaze } from "./fire";
import type { Player, PlayerId } from "../../core/state";

/** Hot Blood: opponents this close (ahead or behind) are thrown back HOT_BLOOD_PUSH per Inner Flame. */
export const HOT_BLOOD_REACH = 7;
export const HOT_BLOOD_PUSH = 3;
/** Ember Step: how far he slides on when his roll stops on fire. */
export const EMBER_SLIDE = 5;
/** Scarlet Fever: tiles set alight on each side of the leader. */
export const FEVER_SPREAD = 5;
/** Pure Fuel: his rolls that throw two dice while an opponent burns. */
export const FUEL_ROLLS = 2;
/** Scarlet Supernova: tiles walked per fire taken back (a burning tile, a burning opponent). */
export const SUPERNOVA_STEP = 2;

/** Hot Blood: spends his Inner Flame on a blast that throws back every touchable opponent close by. */
export function hotBlood(draft: Draft, playerId: PlayerId): void {
  const player = playerIn(draft, playerId);
  const flames = player.innerFlame;
  const tiles = flames * HOT_BLOOD_PUSH;
  const { board } = draft.state;
  const targets = opponentsInSpace(board, draft.players, playerId).filter(
    (other) => !isUntouchable(other) && distanceBetween(board, player, other) <= HOT_BLOOD_REACH,
  );
  updatePlayer(draft, playerId, () => ({ innerFlame: 0 }));
  draft.events.push({
    type: "hotBloodBurst",
    playerId,
    flames,
    tiles,
    targetIds: targets.map((target) => target.id),
  });
  for (const target of targets) {
    const path = pushPath(board, target.position, tiles, target.realmEntry);
    draft.events.push({ type: "playerPushed", playerId: target.id, by: playerId, path });
    updatePlayer(draft, target.id, () => ({ position: path.at(-1) ?? target.position }));
  }
}

export function emberStep(draft: Draft, playerId: PlayerId): void {
  updatePlayer(draft, playerId, () => ({ emberStep: true }));
  draft.events.push({ type: "emberStepReady", playerId });
}

/** After his roll under Ember Step: stopped on fire, he slides EMBER_SLIDE further (once). */
export function slideOnEmbers(draft: Draft, playerId: PlayerId): void {
  const { emberStep: ready, position } = playerIn(draft, playerId);
  if (!ready || !draft.scarletFlames.some((flame) => flame.tile === position)) return;
  updatePlayer(draft, playerId, () => ({ emberStep: false }));
  draft.events.push({ type: "emberSlid", playerId, tile: position });
  advance(draft, playerId, EMBER_SLIDE);
}

/** The opponent furthest along (ties: the first in seat order), wherever they are. */
export function leadingOpponent(draft: Draft, playerId: PlayerId): Player | null {
  const { board } = draft.state;
  const progress = (player: Player) => mainTileOf(board, player.position, player.realmEntry);
  return draft.players
    .filter((player) => player.id !== playerId)
    .reduce<Player | null>((best, player) => (best && progress(best) >= progress(player) ? best : player), null);
}

/**
 * Scarlet Fever: aimed at the leading opponent, who catches fire with FEVER_SPREAD tiles alight on each side.
 * Turned by Themis's verdict it's only undone (his fire can't burn him); a ward turns it away.
 */
export function scarletFever(draft: Draft, playerId: PlayerId): void {
  const leader = leadingOpponent(draft, playerId);
  if (!leader) return;
  if (judgeAim(draft, playerId, leader.id, { cardId: "scarletFever" })) return;
  const ward = aimWard(leader);
  if (ward) {
    draft.events.push({ type: "cardBlocked", playerId, targetId: leader.id, cardId: "scarletFever", ward });
    return;
  }
  setAblaze(draft, leader.id, playerId);
  const { board } = draft.state;
  const { position, realmEntry } = leader;
  const tiles = [
    ...pushPath(board, position, FEVER_SPREAD, realmEntry).reverse(),
    position,
    ...walkPath(board, position, FEVER_SPREAD, realmEntry),
  ];
  lightScarlet(draft, playerId, tiles, [leader.id]);
}

export function pureFuel(draft: Draft, playerId: PlayerId): void {
  updatePlayer(draft, playerId, () => ({ fuelRolls: FUEL_ROLLS }));
  draft.events.push({ type: "fuelPoured", playerId, rolls: FUEL_ROLLS });
}

/** Fires the Supernova would take back: every scarlet tile, every opponent on fire. */
export function supernovaFuel(state: Pick<Draft["state"], "scarletFlames" | "players">, playerId: PlayerId) {
  return {
    fires: state.scarletFlames.length,
    burning: state.players.filter((player) => player.id !== playerId && isBurning(player)).length,
  };
}

/** Scarlet Supernova: takes every scarlet fire back and walks SUPERNOVA_STEP tiles per fire, with no cap. */
export function scarletSupernova(draft: Draft, playerId: PlayerId): void {
  const { fires, burning } = supernovaFuel({ scarletFlames: draft.scarletFlames, players: draft.players }, playerId);
  const tiles = (fires + burning) * SUPERNOVA_STEP;
  const lit = draft.scarletFlames.map((flame) => flame.tile);
  draft.scarletFlames = [];
  draft.events.push({ type: "supernova", playerId, fires, burning, tiles });
  if (lit.length > 0) draft.events.push({ type: "scarletFaded", owner: playerId, tiles: lit });
  quench(
    draft,
    playerId,
    draft.players.filter((player) => player.id !== playerId).map((player) => player.id),
  );
  if (tiles > 0) advance(draft, playerId, tiles);
}
