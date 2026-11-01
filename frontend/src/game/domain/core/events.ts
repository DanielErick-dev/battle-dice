import type {
  AbilityId,
  AimWard,
  AlchemistEvent,
  ArcherEvent,
  AuricEvent,
  BjornEvent,
  BoardEvent,
  CardEvent,
  CronosEvent,
  FairyEvent,
  JesterEvent,
  KageEvent,
  NecromancerEvent,
  PlayerId,
  ScribeEvent,
  SeraphielEvent,
  ThemisEvent,
  TileId,
  WardenEvent,
  ZarekEvent,
} from "@/game/domain/types";

/** What happened while resolving a command, in order: the UI animates them, a server will broadcast them. */
export type GameEvent =
  | TurnEvent
  | AbilityEvent
  | BoardEvent
  | CardEvent
  | AlchemistEvent
  | ArcherEvent
  | AuricEvent
  | BjornEvent
  | CronosEvent
  | FairyEvent
  | JesterEvent
  | KageEvent
  | NecromancerEvent
  | ScribeEvent
  | SeraphielEvent
  | ThemisEvent
  | WardenEvent
  | ZarekEvent;

/** Rolling, moving and passing the turn. */
export type TurnEvent =
  /** `value` is how far the player walks: the dice summed (or the higher when `best`), plus `bonus`. */
  | {
      type: "diceRolled";
      playerId: PlayerId;
      value: number;
      dice: readonly number[];
      best?: boolean;
      bonus?: number;
      /** Dormant Fury's, applied after the bonus. */
      multiplier?: number;
      /** Time Warp's reverse. */
      reversed?: boolean;
    }
  /** `dash`: crossed in a flash of lightning (a Dormant Fury roll) rather than run. */
  | { type: "playerMoved"; playerId: PlayerId; path: readonly TileId[]; dash?: boolean }
  /** Knocked back tile by tile. */
  | {
      type: "playerPushed";
      playerId: PlayerId;
      by: PlayerId;
      path: readonly TileId[];
    }
  | { type: "extraTurnGranted"; playerId: PlayerId; tile: TileId }
  /** `turns` when more than one (a doubled rift). */
  | { type: "skipTurnGained"; playerId: PlayerId; tile: TileId; turns?: number }
  | { type: "turnSkipped"; playerId: PlayerId }
  | { type: "playerWon"; playerId: PlayerId }
  | { type: "turnChanged"; playerId: PlayerId }
  | { type: "gameRestarted" };

/** Charging, using and turning away abilities, and the armour that turns them away. */
export type AbilityEvent =
  | { type: "abilityReady"; playerId: PlayerId; ability: AbilityId }
  | { type: "abilityUsed"; playerId: PlayerId; ability: AbilityId }
  /** Spent for nothing; "away" when the target is out of reach (another realm). */
  | {
      type: "abilityBlocked";
      playerId: PlayerId;
      targetId: PlayerId;
      ability: AbilityId;
      ward: AimWard | "away";
    }
  | { type: "armourRaised"; playerId: PlayerId; turns: number }
  /** Spectral Armour turned away a seal, apparition or black fire. */
  | { type: "armourHeld"; playerId: PlayerId; tile: TileId };
