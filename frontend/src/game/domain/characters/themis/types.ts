import type { AbilityId, CardId, PlayerId } from "@/game/domain/types";

export type ThemisEvent =
  /** `playerId` attacked an opponent (or was branded by her card) and now carries `marks` Marks of Justice (0: wiped). */
  | { type: "justiceMarked"; playerId: PlayerId; by: PlayerId; marks: number }
  /**
   * Themis's Silent Verdict caught the marked `attackerId`: what they aimed (at `defendedId`, or at her when
   * absent) follows, turned on them.
   */
  | {
      type: "verdictPassed";
      playerId: PlayerId;
      attackerId: PlayerId;
      /** What judging paid her (her charge restarts at VERDICT_CHARGE). */
      energyGained: number;
      defendedId?: PlayerId;
      cardId?: CardId;
      ability?: AbilityId;
    }
  /** Blind Justice: everyone walks `tiles` ahead, one after another, from `order[0]`. */
  | { type: "justiceMarched"; playerId: PlayerId; tiles: number; order: readonly PlayerId[] }
  /** The Containment Decree: the dice of `targetIds` can't go above `cap` for their next `rolls` rolls. */
  | { type: "decreeIssued"; playerId: PlayerId; targetIds: readonly PlayerId[]; rolls: number; cap: number }
  /** The Final Judgment: `ceil(distance / 3) × die` tiles ahead for Themis; the target stays put. */
  | { type: "finalJudgment"; playerId: PlayerId; targetId: PlayerId; distance: number; die: number; tiles: number };
