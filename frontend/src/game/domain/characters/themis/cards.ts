import type { DiceRoller } from "../../core/dice";
import { handOverCards } from "../../cards/hand";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { pushPath, walkPath } from "../../board/paths";
import { resolveLanding } from "../../board/landing";
import { resolveWard } from "../../board/harm";
import { walkTrampling } from "../bjorn/untamed";
import { crossSpecters } from "../warden/specters";
import { unpinPassed } from "../archer/arrowRain";
import { markForJustice } from "./verdict";
import type { Board, Player, PlayerId } from "../../types";

/** Cards Confiscation takes from the target's hand. */
export const CONFISCATED_CARDS = 2;
/** Tiles everyone walks under Blind Justice. */
export const JUSTICE_MARCH = 4;
/** The highest die an opponent can throw under the Containment Decree, for DECREE_ROLLS rolls. */
export const CONTAINED_DIE = 3;
export const DECREE_ROLLS = 3;
/** The Final Judgment: every JUDGMENT_SPAN tiles between them (rounded up) is one die of tiles for her. */
export const JUDGMENT_SPAN = 3;

/** A die as the Containment Decree lets it fall: 4–6 fold onto 1–3, so each face stays as likely. */
export function containedFace(face: number): number {
  return ((face - 1) % CONTAINED_DIE) + 1;
}

/** Walks `tiles` ahead like a roll would (trampling, specters) and resolves the landing. */
export function advance(draft: Draft, playerId: PlayerId, tiles: number): void {
  const { position, realmEntry } = playerIn(draft, playerId);
  const path = walkPath(draft.state.board, position, tiles, realmEntry);
  walkTrampling(draft, playerId, path);
  crossSpecters(draft, playerId, path);
  resolveLanding(draft, playerId, path.at(-1) ?? position);
  unpinPassed(draft, path);
}

/** Blind Justice: from Themis on, in turn order, everyone walks JUSTICE_MARCH tiles with no roll and no say. */
export function blindJustice(draft: Draft, playerId: PlayerId): void {
  const ids = draft.players.map((player) => player.id);
  const first = ids.indexOf(playerId);
  const order = [...ids.slice(first), ...ids.slice(0, first)];
  draft.events.push({ type: "justiceMarched", playerId, tiles: JUSTICE_MARCH, order });
  for (const id of order) {
    if (id === playerId) {
      advance(draft, id, JUSTICE_MARCH);
      continue;
    }
    // Walked by her card, the others have no turn to answer prompts in or to take an extra one.
    const extraTurn = draft.extraTurn;
    advance(draft, id, JUSTICE_MARCH);
    draft.extraTurn = extraTurn;
    const ward = draft.pendingWard;
    draft.pendingWard = null;
    if (ward) resolveWard(draft, id, ward.tile, ward.threat, false);
    draft.pendingGrace = null;
  }
}

/** Confiscation: random cards of the target's straight into her hand (fewer if theirs is smaller). */
export function confiscate(draft: Draft, playerId: PlayerId, targetId: PlayerId): void {
  const pile = [...playerIn(draft, targetId).hand];
  const taken = [];
  while (taken.length < CONFISCATED_CARDS && pile.length > 0) {
    taken.push(...pile.splice(Math.floor(draft.random() * pile.length), 1));
  }
  handOverCards(draft, targetId, playerId, taken);
}

/** The Mark of Justice card: every opponent one mark further. */
export function markEveryone(draft: Draft, playerId: PlayerId): void {
  for (const player of draft.players) if (player.id !== playerId) markForJustice(draft, playerId, player.id);
}

/** The Containment Decree: on every opponent, longer if one was already running. */
export function issueDecree(draft: Draft, playerId: PlayerId): void {
  const targetIds = draft.players.filter((player) => player.id !== playerId).map((player) => player.id);
  for (const id of targetIds) {
    updatePlayer(draft, id, (player) => ({ containedRolls: Math.max(player.containedRolls, DECREE_ROLLS) }));
  }
  draft.events.push({ type: "decreeIssued", playerId, targetIds, rolls: DECREE_ROLLS, cap: CONTAINED_DIE });
}

/** Tiles between two players of the same space, whichever of them is ahead. */
export function distanceBetween(board: Board, from: Player, to: Player): number {
  if (from.position === to.position) return 0;
  const reach = board.tiles.length;
  const ahead = walkPath(board, from.position, reach, from.realmEntry).indexOf(to.position);
  if (ahead >= 0) return ahead + 1;
  const behind = pushPath(board, from.position, reach, from.realmEntry).indexOf(to.position);
  return behind >= 0 ? behind + 1 : 0;
}

/** The Final Judgment: she walks ceil(distance / JUDGMENT_SPAN) × a Die of Justice; the target stays put. */
export function finalJudgment(draft: Draft, playerId: PlayerId, targetId: PlayerId, rollDie: DiceRoller): void {
  const distance = distanceBetween(draft.state.board, playerIn(draft, playerId), playerIn(draft, targetId));
  const die = rollDie();
  const tiles = Math.ceil(distance / JUDGMENT_SPAN) * die;
  draft.events.push({ type: "finalJudgment", playerId, targetId, distance, die, tiles });
  if (tiles > 0) advance(draft, playerId, tiles);
}
