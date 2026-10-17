/** Small builders the playback handlers share. */
import { type AbilityId } from "@/game/domain/abilities";
import { blessingTurns } from "@/game/domain/blessings";
import type { PlayerId, TileId } from "@/game/domain/types";
import type { PlaybackTimings } from "../../config";
import { type MatchView, type TileEffectView } from "../matchView";

/**
 * How long an ability's use holds the playback: Transmutation's throw and smoke play out before
 * its card changes; Arrow Rain's archer only aims before the volley (its own event) flies.
 */
export function abilityUsedMs(ability: AbilityId, timings: PlaybackTimings): number {
  if (ability === "transmutation") return timings.transmuteThrowMs;
  if (ability === "arrowRain") return timings.arrowAimMs;
  if (ability === "untamed") return timings.untamedCastMs;
  if (ability === "hellsDrag") return timings.dragCastMs;
  if (ability === "fairyBloom") return timings.frostAimMs;
  return timings.noticeMs;
}

/** Rounds a blessing lasts on the player (Seraphiel's last longer). */
export function blessingTurnsOf(view: MatchView, playerId: PlayerId): number | undefined {
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player && blessingTurns(player);
}

/** An ability notice over the player's tile. */
export function abilityEffect(
  view: MatchView,
  playerId: PlayerId,
  kind: "abilityReady" | "abilityUsed",
  id: AbilityId,
): TileEffectView {
  return { ...playerTileEffect(view, playerId, kind), ability: { id } };
}

/** Where a notice about a player on a tile shows. */
export function tileOf(event: { playerId: PlayerId; tile: TileId }) {
  return { playerId: event.playerId, from: event.tile, to: event.tile };
}

/** An effect shown over the tile the player stands on. */
export function playerTileEffect(view: MatchView, playerId: PlayerId, kind: TileEffectView["kind"]): TileEffectView {
  const tile = view.players.find((player) => player.id === playerId)?.position ?? 0;
  return { kind, playerId, from: tile, to: tile };
}
