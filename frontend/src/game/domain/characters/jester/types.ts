import type { PlayerId } from "@/game/domain/types";

/** `fortune`: thrown for that many cards instead of against an opponent. */
export type JesterEvent = {
  type: "gambleRolled";
  playerId: PlayerId;
  value: number;
  won: boolean;
  fortune?: boolean;
};
