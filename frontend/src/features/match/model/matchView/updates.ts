import type { Player, PlayerId, TileId } from "@/game/domain/types";
import type { MatchView } from "./view";

export function withPlayer(view: MatchView, playerId: PlayerId, patch: (player: Player) => Partial<Player>): MatchView {
  return {
    ...view,
    players: view.players.map((player) => (player.id === playerId ? { ...player, ...patch(player) } : player)),
  };
}

export function withPlayerAt(view: MatchView, playerId: PlayerId, position: TileId): MatchView {
  return withPlayer(view, playerId, () => ({ position }));
}
