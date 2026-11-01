import { getTile } from "../../board/board";
import { DIVINE_CARDS, type CardId } from "../../cards/catalog";
import { GameRuleError } from "../../core/errors";
import { giveCard } from "../../cards/hand";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { grantBlessing, TIMED_BLESSINGS } from "../../board/blessings";
import { blastTrapsAhead } from "../../board/traps";
import { aimWard } from "../../core/playerStatus";
import { passVerdict, verdictArmed } from "../themis/verdict";
import type { Board, TileId, TimedBlessing } from "../../board/types";
import type { Player, PlayerId } from "../../core/state";

// Seraphiel picks heaven's gifts, is crowned leaving heaven, and falls for good on entering hell.

/** Seraphic or infernal alike. */
export const CROWN_BONUS = 1;
/** Lost turns when the Fallen Angel stops on a celestial portal. */
export const DIVINE_CHAINS_ROUNDS = 3;
/** Alone on the board, the traps ahead Hell's Drag swallows instead. */
export const DRAG_TRAPS = 2;

export const GRACE_BLESSINGS = TIMED_BLESSINGS;

export function isSeraph(player: Player): boolean {
  return player.ability === "seraphBlessing";
}

export function isFallen(player: Player): boolean {
  return player.ability === "hellsDrag";
}

export function inHell(board: Board, position: TileId): boolean {
  return getTile(board, position).track?.realm === "infernal";
}

function inRealm(board: Board, position: TileId): boolean {
  return getTile(board, position).track !== undefined;
}

export function fallIfInHell(draft: Draft, playerId: PlayerId): void {
  const player = playerIn(draft, playerId);
  if (!isSeraph(player) || !inHell(draft.state.board, player.position)) return;
  updatePlayer(draft, playerId, () => ({ ability: "hellsDrag", blessings: [], crown: "infernal" }));
  draft.events.push({ type: "seraphFell", playerId, tile: player.position });
}

/** Runs after every command, so he's crowned or falls however the command moved him. */
export function crownAndFall(draft: Draft): void {
  const { board } = draft.state;
  for (const before of draft.state.players) {
    const player = playerIn(draft, before.id);
    if (!isSeraph(player)) continue;
    const leftHeaven =
      getTile(board, before.position).track?.realm === "celestial" &&
      getTile(board, player.position).track?.realm !== "celestial";
    if (leftHeaven && player.crown === null) {
      updatePlayer(draft, player.id, () => ({ crown: "seraphic" }));
      draft.events.push({ type: "crownGained", playerId: player.id, crown: "seraphic" });
    }
    fallIfInHell(draft, player.id);
  }
}

export function offerGrace(draft: Draft, playerId: PlayerId, tile: TileId, offer: "blessing" | "relic"): void {
  draft.pendingGrace = { tile, offer };
  draft.events.push({ type: "graceOffered", playerId, tile, offer });
}

export function receiveGrace(
  draft: Draft,
  playerId: PlayerId,
  tile: TileId,
  offer: "blessing" | "relic",
  pick: { blessing?: TimedBlessing; cardId?: CardId },
): void {
  if (offer === "blessing") {
    if (!pick.blessing || !GRACE_BLESSINGS.includes(pick.blessing)) throw new GameRuleError("INVALID_GRACE");
    grantBlessing(draft, playerId, pick.blessing);
    draft.events.push({ type: "blessingReceived", playerId, blessing: pick.blessing, tile, energyGained: 0 });
    return;
  }
  if (!pick.cardId || !DIVINE_CARDS.includes(pick.cardId)) throw new GameRuleError("INVALID_GRACE");
  giveCard(draft, playerId, { uid: `${playerId}:relic${draft.state.turn}:${tile}`, cardId: pick.cardId });
}

/** Anyone not already in a realm; armoured ones too, who then turn it away. */
export function dragTargets(board: Board, players: readonly Player[], playerId: PlayerId): Player[] {
  if (!board.tracks.some((track) => track.realm === "infernal")) return [];
  return players.filter((player) => player.id !== playerId && !inRealm(board, player.position));
}

/** Hell costs the target time and curses, not ground; with nobody to pull down, it swallows traps ahead. */
export function hellsDrag(draft: Draft, playerId: PlayerId, targetId: PlayerId | undefined): void {
  const { board } = draft.state;
  const targets = dragTargets(board, draft.players, playerId);
  if (targets.length === 0) {
    blastTrapsAhead(draft, playerId, DRAG_TRAPS);
    return;
  }
  const target = targets.find((candidate) => candidate.id === targetId);
  const hell = board.tracks.find((track) => track.realm === "infernal");
  if (!target || !hell) throw new GameRuleError("INVALID_TARGET");
  const ward = aimWard(target);
  if (ward) {
    draft.events.push({ type: "abilityBlocked", playerId, targetId: target.id, ability: "hellsDrag", ward });
    return;
  }
  if (verdictArmed(target)) {
    passVerdict(draft, target.id, playerId, { ability: "hellsDrag" });
    dragIntoHell(draft, target.id, playerId);
    return;
  }

  dragIntoHell(draft, playerId, target.id);
}

/** Hell's Drag and the Call of the Abyss: its way in and out is the very tile they were taken from. */
export function dragIntoHell(draft: Draft, playerId: PlayerId, targetId: PlayerId): void {
  const hell = draft.state.board.tracks.find((track) => track.realm === "infernal");
  if (!hell) throw new GameRuleError("INVALID_TARGET");
  const from = playerIn(draft, targetId).position;
  const to = hell.tiles[0];
  updatePlayer(draft, targetId, () => ({ position: to, realmEntry: { portal: from, exit: from } }));
  draft.events.push({ type: "hellDragged", playerId, targetId, from, to });
}
