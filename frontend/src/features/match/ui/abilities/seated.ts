import type { Player } from "@/game/domain/types";
import type { MatchView } from "../../model/matchView";

/** Players with their seat (0 first) for the pickers' "J1" tags. */
export function seated(view: MatchView, players: readonly Player[]) {
  return players.map((player) => ({ player, seat: view.players.indexOf(player) }));
}
