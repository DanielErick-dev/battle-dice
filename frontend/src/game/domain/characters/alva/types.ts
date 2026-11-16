import type { CardInstance, PlayerId } from "../../core/state";

/** Unidade Alva's own state on her Player (see characters/alva/); everyone else keeps NO_ALVA. */
export interface AlvaState {
  /** Her own turns since the Memory Overload last went off (it goes off at OVERLOAD_ROUNDS). */
  overload: number;
}

export const NO_ALVA: AlvaState = { overload: 0 };

export type AlvaEvent =
  /** The EMP: `victims` lose their cards and abilities for BLACKOUT_TURNS, then BROWNOUT_TURNS of halved moves. */
  | { type: "empPulsed"; playerId: PlayerId; victims: readonly PlayerId[] }
  /** The Memory Overload went off: each overloaded opponent's real cards it burnt. */
  | {
      type: "memoryOverload";
      playerId: PlayerId;
      burnt: readonly { playerId: PlayerId; cards: readonly CardInstance[] }[];
    }
  | { type: "corruptedInjected"; playerId: PlayerId; targetId: PlayerId; count: number }
  /** `playerId` deleted a Corrupted Card by sacrificing `card` with it. */
  | { type: "corruptedPurged"; playerId: PlayerId; card: CardInstance }
  /** The Brownout halved a moving card's `from` to `to`. */
  | { type: "brownoutSapped"; playerId: PlayerId; from: number; to: number }
  | { type: "firewallLocked"; playerId: PlayerId; targetId: PlayerId; turns: number }
  /** The Data Collapse: `targetId`'s hand of `weight` cards sends them back. */
  | { type: "dataCollapsed"; playerId: PlayerId; targetId: PlayerId; weight: number }
  /** The Overload Thruster or the Apocalypse's harvest: she flies `tiles` ahead. */
  | { type: "alvaThrust"; playerId: PlayerId; tiles: number }
  | { type: "apocalypseProtocol"; playerId: PlayerId };
