import type { AbilityId, CardId, PlayerId, TileId } from "@/game/domain/types";

export type ThemisEvent =
  /** Themis's Blind Scale found the hidden trap on `tile` and took it apart. */
  | { type: "hiddenTrapDisarmed"; playerId: PlayerId; tile: TileId; energyGained: number }
  /** Themis's Silent Verdict caught `attackerId` aiming at her: what they aimed follows, turned on them. */
  | {
      type: "verdictPassed";
      playerId: PlayerId;
      attackerId: PlayerId;
      cardId?: CardId;
      ability?: AbilityId;
    }
  /** The Scales of Justice: both players' energy after it was split evenly. */
  | { type: "energyWeighed"; playerId: PlayerId; targetId: PlayerId; energy: number; targetEnergy: number };
