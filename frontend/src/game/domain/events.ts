import type { AbilityId } from "./abilities";
import type { CardId } from "./cards";
import type { AimWard } from "./players";
import type {
  Blessing,
  CardInstance,
  Crown,
  PlayerId,
  RealmKind,
  SealKind,
  SpecterKind,
  Threat,
  TileId,
  TrapCurse,
  TrapWard,
} from "./types";

/** What happened while resolving a command, in order: the UI animates them, a server will broadcast them. */
export type GameEvent =
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
  | { type: "portalEntered"; playerId: PlayerId; from: TileId; to: TileId }
  /** Carried from the portal onto the track's first tile. */
  | {
      type: "realmEntered";
      playerId: PlayerId;
      realm: RealmKind;
      from: TileId;
      to: TileId;
    }
  | {
      type: "blessingReceived";
      playerId: PlayerId;
      blessing: Blessing;
      tile: TileId;
      energyGained: number;
      /** False when the ability was already full. */
      charged?: boolean;
    }
  | { type: "trapTriggered"; playerId: PlayerId; from: TileId; to: TileId }
  /** Followed by a playerMoved with the tiles walked. */
  | { type: "advanceTriggered"; playerId: PlayerId; from: TileId; to: TileId }
  /** `card` is null with an empty hand. */
  | {
      type: "trapCursed";
      playerId: PlayerId;
      curse: TrapCurse;
      card: CardInstance | null;
      energyLost: number;
    }
  | { type: "extraTurnGranted"; playerId: PlayerId; tile: TileId }
  | { type: "skipTurnGained"; playerId: PlayerId; tile: TileId }
  | { type: "turnSkipped"; playerId: PlayerId }
  /** A lost turn in `owner`'s snow drained `energy` from the player into the fairy. */
  | { type: "snowDrained"; playerId: PlayerId; owner: PlayerId; energy: number }
  /** A trap, curse or (Untamed) lost-turn tile missed the player; a `hidden` trap then moves. */
  | {
      type: "trapBlocked";
      playerId: PlayerId;
      tile: TileId;
      ward: TrapWard;
      hidden: boolean;
    }
  /** The Trap Ward smashed the trap on `tile` for good. */
  | { type: "trapDestroyed"; playerId: PlayerId; tile: TileId; hidden: boolean }
  /** Arrow Rain on opponents' tiles (each then pushed) or on the traps ahead it pins (`pinned`, `hidden` revealed). */
  | {
      type: "arrowsLoosed";
      playerId: PlayerId;
      targets: readonly TileId[];
      pinned: readonly TileId[];
      hidden: readonly TileId[];
    }
  /** `fortune`: thrown for that many cards instead of against an opponent. */
  | {
      type: "gambleRolled";
      playerId: PlayerId;
      value: number;
      won: boolean;
      fortune?: boolean;
    }
  /** Random cards from `from`'s hand to `playerId`'s; `discarded` found the hand full. */
  | {
      type: "cardsStolen";
      playerId: PlayerId;
      from: PlayerId;
      cards: readonly CardInstance[];
      discarded: readonly CardInstance[];
    }
  /** `tiles` in SPECTER_KINDS order. */
  | { type: "spectersSummoned"; playerId: PlayerId; tiles: readonly TileId[] }
  /** Hunger moves `energyTaken` to the owner (the rest charging them); Plunder follows with plunderOffered. */
  | {
      type: "specterStruck";
      playerId: PlayerId;
      owner: PlayerId;
      tile: TileId;
      kind: SpecterKind;
      energyTaken: number;
      energyGained: number;
      chargeGained: number;
    }
  /** Walking through the Warden themselves fades their apparitions. */
  | { type: "spectersDispelled"; playerId: PlayerId; owner: PlayerId; tiles: readonly TileId[] }
  | { type: "plunderOffered"; owner: PlayerId; victim: PlayerId }
  /** Which seal is where stays the writer's secret. */
  | { type: "sealsWritten"; playerId: PlayerId; tiles: readonly TileId[] }
  /** The Pact moves energy here; the Tithe and Ruin follow as cardsStolen and playerPushed. */
  | {
      type: "sealBroken";
      playerId: PlayerId;
      owner: PlayerId;
      tile: TileId;
      kind: SealKind;
      energyLost: number;
      energyGained: number;
    }
  /** A hidden trap among `tiles` is gone too. */
  | { type: "tilesEnchanted"; playerId: PlayerId; tiles: readonly TileId[] }
  /** The owner is carried ahead (a playerMoved follows); an opponent is snowed in for `frozen` rounds. */
  | {
      type: "enchantmentStirred";
      playerId: PlayerId;
      owner: PlayerId;
      tile: TileId;
      frozen: number;
      charged: boolean;
    }
  /** No harm was left ahead to snow (see fairy.ts). */
  | { type: "winterBegan"; playerId: PlayerId }
  | { type: "winterSpread"; owner: PlayerId; from: TileId; to: TileId }
  | { type: "flamesLit"; playerId: PlayerId; tiles: readonly TileId[] }
  /** A playerPushed follows. */
  | { type: "flamesScorched"; playerId: PlayerId; owner: PlayerId; tile: TileId; energyLost: number; charged: boolean }
  | { type: "flamesFaded"; owner: PlayerId; tiles: readonly TileId[] }
  | { type: "armourRaised"; playerId: PlayerId; turns: number }
  /** Spectral Armour turned away a seal, apparition or black fire. */
  | { type: "armourHeld"; playerId: PlayerId; tile: TileId }
  | { type: "cardsResurrected"; playerId: PlayerId; cards: readonly CardInstance[] }
  /** A walk freed a pinned trap (a hidden one moves elsewhere, unseen). */
  | { type: "trapUnpinned"; tile: TileId }
  /** It then moves elsewhere in its zone. */
  | { type: "hiddenTrapSprung"; playerId: PlayerId; tile: TileId; to: TileId }
  /** Hidden traps stay unseen. */
  | { type: "levitatedOver"; playerId: PlayerId; tile: TileId }
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
  /** Played and spent for nothing. */
  | {
      type: "cardBlocked";
      playerId: PlayerId;
      targetId: PlayerId;
      cardId: CardId;
      ward: AimWard;
    }
  /** Seraphiel is the Fallen Angel for good (see seraph.ts). */
  | { type: "seraphFell"; playerId: PlayerId; tile: TileId }
  /** Only the seraphic one; the infernal crown comes with seraphFell. */
  | { type: "crownGained"; playerId: PlayerId; crown: Crown }
  /** The Fallen Angel on a celestial portal: heaven stays shut and chains him for `rounds`. */
  | { type: "heavenBarred"; playerId: PlayerId; tile: TileId; rounds: number }
  | {
      type: "graceOffered";
      playerId: PlayerId;
      tile: TileId;
      offer: "blessing" | "relic";
    }
  | {
      type: "hellDragged";
      playerId: PlayerId;
      targetId: PlayerId;
      from: TileId;
      to: TileId;
    }
  /** `reach` starts at the player's tile; `tiles` are those that lost a spell. */
  | {
      type: "boardCleansed";
      playerId: PlayerId;
      reach: readonly TileId[];
      tiles: readonly TileId[];
    }
  /** Halt loses the target's next `rounds` turns; reverse walks their next `rounds` rolls back. */
  | {
      type: "timeBent";
      playerId: PlayerId;
      targetId: PlayerId;
      power: "halt" | "reverse";
      rounds: number;
    }
  | { type: "untamedUnleashed"; playerId: PlayerId; turns: number }
  /** Comes between the playerMoved up to `tile` and the one for the rest of the walk. */
  | {
      type: "playerTrampled";
      playerId: PlayerId;
      by: PlayerId;
      tile: TileId;
      path: readonly TileId[];
      /** Sitting out lost turns (see isSeated): they get up to be shoved. */
      seated: boolean;
    }
  | { type: "wardOffered"; playerId: PlayerId; tile: TileId; threat: Threat }
  /** Thrown back for stopping on her tile, or `ahead` when she stopped on theirs. */
  | { type: "susanooRepelled"; playerId: PlayerId; by: PlayerId; tile: TileId; to: TileId; ahead: boolean }
  | { type: "cardDrawn"; playerId: PlayerId; card: CardInstance }
  /** `from` and `sacrificed` left the hand; `to` took `from`'s place. */
  | {
      type: "cardTransmuted";
      playerId: PlayerId;
      from: CardInstance;
      sacrificed: CardInstance;
      to: CardInstance;
    }
  | {
      type: "cardsFused";
      playerId: PlayerId;
      used: readonly string[];
      card: CardInstance;
    }
  | { type: "deckReshuffled"; playerId: PlayerId; size: number }
  /** The drawn card is among those the player can throw away. */
  | { type: "discardRequired"; playerId: PlayerId; card: CardInstance }
  | {
      type: "cardDiscarded";
      playerId: PlayerId;
      card: CardInstance;
      hand: readonly CardInstance[];
    }
  | {
      type: "cardPlayed";
      playerId: PlayerId;
      card: CardInstance;
      targetId: PlayerId | null;
      value: number | null;
    }
  /** Knocked back tile by tile. */
  | {
      type: "playerPushed";
      playerId: PlayerId;
      by: PlayerId;
      path: readonly TileId[];
    }
  | { type: "cardTeleported"; playerId: PlayerId; from: TileId; to: TileId }
  | { type: "playerWon"; playerId: PlayerId }
  | { type: "turnChanged"; playerId: PlayerId }
  | { type: "gameRestarted" };
