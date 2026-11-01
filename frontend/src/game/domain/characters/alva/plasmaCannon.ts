import { opponentsInReach } from "../../board/reach";
import { pushPath } from "../../board/paths";
import { blastTrapsAhead } from "../../board/traps";
import { updatePlayer, type Draft } from "../../core/draft";
import type { PlayerId } from "../../types";

export const PLASMA_TRAPS = 2;
export const PLASMA_PUSH = 6;

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
