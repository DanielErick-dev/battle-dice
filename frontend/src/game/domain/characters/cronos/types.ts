import type { PlayerId } from "@/game/domain/types";

/** Halt loses the target's next `rounds` turns; reverse walks their next `rounds` rolls back. */
export type CronosEvent = {
  type: "timeBent";
  playerId: PlayerId;
  targetId: PlayerId;
  power: "halt" | "reverse";
  rounds: number;
};
