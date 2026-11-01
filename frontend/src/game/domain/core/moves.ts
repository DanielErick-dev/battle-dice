import { moveTo, playerIn, type Draft } from "./draft";
import { pushPath } from "../board/paths";
import type { PlayerId, RealmEntry, TileId } from "@/game/domain/types";

/** Pushes `playerId` back `steps` tiles (from their tile and realm entry unless given), announcing it as `by`'s. */
export function knockBack(
  draft: Draft,
  playerId: PlayerId,
  by: PlayerId,
  steps: number,
  { from, entry }: { from?: TileId; entry?: RealmEntry | null } = {},
): void {
  const player = playerIn(draft, playerId);
  const origin = from ?? player.position;
  const path = pushPath(draft.state.board, origin, steps, entry === undefined ? player.realmEntry : entry);
  draft.events.push({ type: "playerPushed", playerId, by, path });
  moveTo(draft, playerId, path.at(-1) ?? origin);
}
