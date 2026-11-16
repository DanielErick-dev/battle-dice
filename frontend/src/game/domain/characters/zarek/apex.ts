import { walkPath } from "../../board/paths";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { isUntouchable } from "../../core/playerStatus";
import { shuffle } from "../../core/random";
import { clipAtWalls } from "../tenzai/elements";
import type { PlayerId } from "../../core/state";
import type { Threat, TileId } from "../../board/types";
import { riftsOf } from "./rifts";
import { devour, VOID_CAPACITY } from "./void";

/** Own turns the Void Apex keeps each opponent inside, and how many of his traps it pulls back in. */
export const APEX_TURNS = 3;
export const APEX_PULLS = 3;

/** Who threw them into the Void and how many of their own turns are left in there. */
export interface VoidBound {
  owner: PlayerId;
  turns: number;
}

/**
 * The Void Apex: every opponent not protected falls into Zarek's Void for APEX_TURNS of their turns (their rolls
 * walk him instead), then it pulls up to APEX_PULLS of his own harms off the board back into it.
 */
export function voidApex(draft: Draft, playerId: PlayerId): void {
  const victims = draft.players.filter((player) => player.id !== playerId && !isUntouchable(player));
  for (const victim of victims) {
    updatePlayer(draft, victim.id, () => ({ voidBound: { owner: playerId, turns: APEX_TURNS } }));
  }
  draft.events.push({ type: "voidApex", playerId, victims: victims.map((victim) => victim.id) });
  pullOwnHarms(draft, playerId);
}

/** His rifts and scars still armed, drawn at random, as many as fit in the Void (APEX_PULLS at most). */
function pullOwnHarms(draft: Draft, playerId: PlayerId): void {
  const room = VOID_CAPACITY - playerIn(draft, playerId).zarek.hold.length;
  const rifts = riftsOf(draft.state.board)
    .filter((tile) => tile.rift?.owner === playerId && !draft.destroyedTraps.includes(tile.id))
    .map((tile) => ({ kind: "rift" as const, tile: tile.id }));
  const scars = draft.voidScars
    .filter((scar) => scar.owner === playerId)
    .map((scar) => ({ kind: "scar" as const, tile: scar.tile }));
  const pulled = shuffle([...rifts, ...scars], draft.random).slice(0, Math.max(0, Math.min(APEX_PULLS, room)));
  for (const harm of pulled) {
    if (harm.kind === "rift") devour(draft, playerId, harm.tile, riftThreat(draft, harm.tile));
    else pullScar(draft, playerId, harm.tile);
  }
}

function riftThreat(draft: Draft, tile: TileId): Threat {
  const kind = draft.state.board.tiles.find((candidate) => candidate.id === tile)?.effect.kind;
  return kind === "curse" ? "curse" : kind === "skipTurn" ? "skipTurn" : "trap";
}

function pullScar(draft: Draft, playerId: PlayerId, tile: TileId): void {
  const scar = draft.voidScars.find((candidate) => candidate.tile === tile && candidate.owner === playerId);
  if (!scar) return;
  draft.voidScars = draft.voidScars.filter((candidate) => candidate !== scar);
  updatePlayer(draft, playerId, (player) => ({ zarek: { idle: 0, hold: [...player.zarek.hold, scar.harm] } }));
  draft.events.push({ type: "voidSwallowed", playerId, tile, item: scar.harm, hidden: false });
}

/** A roll thrown from inside the Void walks its owner instead (the tile he stops on does nothing). True if taken. */
export function takeVoidRoll(draft: Draft, rollerId: PlayerId, value: number): boolean {
  const bound = playerIn(draft, rollerId).voidBound;
  if (!bound) return false;
  const owner = playerIn(draft, bound.owner);
  const { path } = clipAtWalls(draft, owner.id, walkPath(draft.state.board, owner.position, value, owner.realmEntry));
  updatePlayer(draft, owner.id, () => ({ position: path.at(-1) ?? owner.position }));
  draft.events.push({ type: "voidRollTaken", playerId: owner.id, victimId: rollerId, value, path });
  return true;
}

/** One of their turns spent inside the Void; the last lets them out. */
export function wearVoidBound(draft: Draft, playerId: PlayerId): void {
  const bound = playerIn(draft, playerId).voidBound;
  if (!bound) return;
  const turns = bound.turns - 1;
  updatePlayer(draft, playerId, () => ({ voidBound: turns > 0 ? { ...bound, turns } : null }));
  if (turns <= 0) draft.events.push({ type: "voidReleased", playerId });
}
