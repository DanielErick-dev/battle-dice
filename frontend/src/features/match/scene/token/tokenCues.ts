import type { Player } from "@/game/domain/types";
import { INNER_FLAME_MAX } from "@/game/domain/characters/akane/fire";
import type { BoardLayout, Vec3 } from "@/features/shared/board/boardLayout";
import type { MatchView } from "../../model/matchView";

/** Only figures sharing a tile lift their tags apart; one alone keeps its tag right over its head. */
export function tileSeat(players: readonly Player[], seat: number): number {
  const position = players[seat]?.position;
  if (position === undefined) return 0;
  return players.slice(0, seat).filter((other) => other.position === position).length;
}

/** Where whoever Themis's verdict judges stands, for her to point at; null for anyone else. */
export function judgedBy(view: MatchView, layout: BoardLayout, playerId: string): Vec3 | null {
  const verdict = view.fx.verdict;
  if (verdict?.judgeId !== playerId) return null;
  const attacker = view.players.find((player) => player.id === verdict.attackerId);
  return attacker ? layout.position(attacker.position) : null;
}

/** Fire worth seeing at a glance over a figure: rounds left on fire, or Akane's Inner Flame. */
export function fireStatus({ burning, innerFlame, impetusRolls }: Player): string {
  if (burning > 0) return ` · 🔥${burning}`;
  if (impetusRolls > 0) return ` · ÍMPETO ${impetusRolls}`;
  if (innerFlame > 0) return ` · CHAMA ${innerFlame}/${INNER_FLAME_MAX}`;
  return "";
}
