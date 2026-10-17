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

/**
 * Everything that happened while resolving a command, in order.
 * The UI replays these to animate; a future server broadcasts them to the room.
 */
export type GameEvent =
  /**
   * `dice` holds each die thrown (two under Berserk Fury / Oracle Eye); `value` is how far the
   * player walks: their sum, or the higher one when `best`, plus any card `bonus`.
   */
  | {
      type: "diceRolled";
      playerId: PlayerId;
      value: number;
      dice: readonly number[];
      best?: boolean;
      bonus?: number;
      /** The total was multiplied by this (Dormant Fury), after the bonus. */
      multiplier?: number;
      /** Walked backwards (Cronos's reversed time). */
      reversed?: boolean;
    }
  /** `dash`: crossed in a flash of lightning (a Dormant Fury roll) rather than run. */
  | { type: "playerMoved"; playerId: PlayerId; path: readonly TileId[]; dash?: boolean }
  | { type: "portalEntered"; playerId: PlayerId; from: TileId; to: TileId }
  /** A realm portal opened: the player is carried from the portal to the track's first tile. */
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
      /** A "charge" blessing gave the ability its turn of charge (not when it was full already). */
      charged?: boolean;
    }
  | { type: "trapTriggered"; playerId: PlayerId; from: TileId; to: TileId }
  /** Followed by a playerMoved with the tiles walked. */
  | { type: "advanceTriggered"; playerId: PlayerId; from: TileId; to: TileId }
  /** A cursed trap took a card (`card`, null with an empty hand) or energy (`energyLost`, 0 when there was none). */
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
  /** A lost turn in `owner`'s snow drained `energy` (0 when they had none) from the player into the fairy. */
  | { type: "snowDrained"; playerId: PlayerId; owner: PlayerId; energy: number }
  /**
   * A trap, a curse or (Untamed) a lost-turn tile on `tile` didn't touch the player; `hidden` for a
   * hidden trap, which then moves.
   */
  | {
      type: "trapBlocked";
      playerId: PlayerId;
      tile: TileId;
      ward: TrapWard;
      hidden: boolean;
    }
  /** The Trap Ward smashed the trap on `tile`: it does nothing for the rest of the game. */
  | { type: "trapDestroyed"; playerId: PlayerId; tile: TileId; hidden: boolean }
  /**
   * Arrow Rain: the volley falls on `targets`, the opponents' tiles (each then comes as a
   * playerPushed) or, alone on the board, the traps ahead it pins down (`pinned`, the same tiles;
   * `hidden` ones among them show themselves).
   */
  | {
      type: "arrowsLoosed";
      playerId: PlayerId;
      targets: readonly TileId[];
      pinned: readonly TileId[];
      hidden: readonly TileId[];
    }
  /**
   * Card Gamble's die of fortune: `won` above CARD_GAMBLE_LOSES_UP_TO; `fortune` when thrown for
   * cards (as many drawn as it shows) instead of against an opponent.
   */
  | {
      type: "gambleRolled";
      playerId: PlayerId;
      value: number;
      won: boolean;
      fortune?: boolean;
    }
  /**
   * Random cards went from `from`'s hand to `playerId`'s (Card Gamble); `discarded` are those
   * among them that found the hand full and went to the discard pile instead.
   */
  | {
      type: "cardsStolen";
      playerId: PlayerId;
      from: PlayerId;
      cards: readonly CardInstance[];
      discarded: readonly CardInstance[];
    }
  /** Spectral Apparitions: the player's apparitions appear on `tiles` (SPECTER_KINDS order). */
  | { type: "spectersSummoned"; playerId: PlayerId; tiles: readonly TileId[] }
  /**
   * `playerId` walked through `owner`'s apparition on `tile` (or, alone, its owner did, to be
   * rewarded). Hunger moved `energyTaken` into the owner's `energyGained`, the rest charging
   * their ability by `chargeGained`; Plunder follows with plunderOffered (cardDrawn alone).
   */
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
  /** `playerId` walked through the Warden `owner` themselves: their apparitions on `tiles` fade. */
  | { type: "spectersDispelled"; playerId: PlayerId; owner: PlayerId; tiles: readonly TileId[] }
  /** The Plunder specter caught `victim`: `owner` is to pick the cards it takes. */
  | { type: "plunderOffered"; owner: PlayerId; victim: PlayerId }
  /** Forbidden Seals: seals written on `tiles` (which seal is where stays the writer's secret). */
  | { type: "sealsWritten"; playerId: PlayerId; tiles: readonly TileId[] }
  /**
   * `playerId` broke `owner`'s seal on `tile` and suffers it (or, alone, its owner is rewarded): the
   * Pact moves energy (`energyLost` by the one who stepped on it, `energyGained` by its owner); the
   * Tithe's card and the Ruin's knock-back follow as cardsStolen and playerPushed (cardDrawn and
   * playerMoved alone).
   */
  | {
      type: "sealBroken";
      playerId: PlayerId;
      owner: PlayerId;
      tile: TileId;
      kind: SealKind;
      energyLost: number;
      energyGained: number;
    }
  /** Fairy Bloom enchanted `tiles` for good (a hidden trap among them is gone too). */
  | { type: "tilesEnchanted"; playerId: PlayerId; tiles: readonly TileId[] }
  /**
   * `playerId` stopped on (or, its owner, walked over) `owner`'s enchanted `tile`: its owner is
   * carried ahead (a playerMoved follows), an opponent is stuck in the snow for `frozen` rounds;
   * `charged` says whether the owner's ability gained a turn of charge.
   */
  | {
      type: "enchantmentStirred";
      playerId: PlayerId;
      owner: PlayerId;
      tile: TileId;
      frozen: number;
      charged: boolean;
    }
  /** No harm was left ahead of `playerId` to snow: their Eternal Winter begins (see fairy.ts). */
  | { type: "winterBegan"; playerId: PlayerId }
  /** A round went by under `owner`'s Eternal Winter: the main path froze from `from` to `to`. */
  | { type: "winterSpread"; owner: PlayerId; from: TileId; to: TileId }
  /** Eternal Flames set `tiles` on black fire. */
  | { type: "flamesLit"; playerId: PlayerId; tiles: readonly TileId[] }
  /**
   * `playerId` stopped on `owner`'s black fire on `tile`: they lose energy, and a playerPushed
   * follows; `charged` says whether the owner's ability gained a turn of charge.
   */
  | { type: "flamesScorched"; playerId: PlayerId; owner: PlayerId; tile: TileId; energyLost: number; charged: boolean }
  /** `owner`'s black fire on `tiles` went out. */
  | { type: "flamesFaded"; owner: PlayerId; tiles: readonly TileId[] }
  /** Spectral Armour rose round the player for `turns` of their turns. */
  | { type: "armourRaised"; playerId: PlayerId; turns: number }
  /** Something aimed at `playerId` (a seal, an apparition, black fire) was turned away by their Spectral Armour. */
  | { type: "armourHeld"; playerId: PlayerId; tile: TileId }
  /** Resurrection brought `cards` back from the player's discard pile to their hand. */
  | { type: "cardsResurrected"; playerId: PlayerId; cards: readonly CardInstance[] }
  /** A walk passed over a pinned trap, which works again (a hidden one moves elsewhere, unseen). */
  | { type: "trapUnpinned"; tile: TileId }
  /** A hidden trap sprang on `tile`, knocking the player back to `to`; it then moves elsewhere in its zone. */
  | { type: "hiddenTrapSprung"; playerId: PlayerId; tile: TileId; to: TileId }
  /** A levitating player floated over `tile`, whose effect didn't touch them (hidden traps stay unseen). */
  | { type: "levitatedOver"; playerId: PlayerId; tile: TileId }
  /** The player's ability finished charging as their turn started. */
  | { type: "abilityReady"; playerId: PlayerId; ability: AbilityId }
  /** The player spent their ability. */
  | { type: "abilityUsed"; playerId: PlayerId; ability: AbilityId }
  /**
   * `playerId`'s ability, aimed at `targetId`, was turned away and spent for nothing: by `ward`
   * (see aimWard), or "away" when the target is somewhere it can't reach (another realm).
   */
  | {
      type: "abilityBlocked";
      playerId: PlayerId;
      targetId: PlayerId;
      ability: AbilityId;
      ward: AimWard | "away";
    }
  /** `playerId`'s card, aimed at `targetId`, was turned away by `ward` (see aimWard): played and spent for nothing. */
  | {
      type: "cardBlocked";
      playerId: PlayerId;
      targetId: PlayerId;
      cardId: CardId;
      ward: AimWard;
    }
  /** Seraphiel set foot in hell on `tile`: he is the Fallen Angel now, for good (see seraph.ts). */
  | { type: "seraphFell"; playerId: PlayerId; tile: TileId }
  /** Seraphiel's crown came to his head: seraphic out of heaven (the Fall's infernal one comes with seraphFell). */
  | { type: "crownGained"; playerId: PlayerId; crown: Crown }
  /** The Fallen Angel stopped on a celestial portal: heaven stays shut, and its chains hold him `rounds` rounds. */
  | { type: "heavenBarred"; playerId: PlayerId; tile: TileId; rounds: number }
  /** Seraphiel stopped on a heaven tile and picks what he receives (see PendingGrace). */
  | {
      type: "graceOffered";
      playerId: PlayerId;
      tile: TileId;
      offer: "blessing" | "relic";
    }
  /** Hell's Drag: `targetId` was pulled down from `from` onto hell's first tile `to`. */
  | {
      type: "hellDragged";
      playerId: PlayerId;
      targetId: PlayerId;
      from: TileId;
      to: TileId;
    }
  /** Cleansing Tide rolled over `reach` (the player's tile first) and washed every spell off `tiles`. */
  | {
      type: "boardCleansed";
      playerId: PlayerId;
      reach: readonly TileId[];
      tiles: readonly TileId[];
    }
  /** Time Warp bent `targetId`'s time: halted (their next `rounds` turns lost) or reversed (their next `rounds` rolls walk back). */
  | {
      type: "timeBent";
      playerId: PlayerId;
      targetId: PlayerId;
      power: "halt" | "reverse";
      rounds: number;
    }
  /** Untamed: nothing harms the player for `turns` of their turns. */
  | { type: "untamedUnleashed"; playerId: PlayerId; turns: number }
  /**
   * The Berserker `by` walked through (or stopped on) `playerId` on `tile` and knocked them back
   * along `path`. Comes between the playerMoved of the walk up to `tile` and that of the rest.
   */
  | {
      type: "playerTrampled";
      playerId: PlayerId;
      by: PlayerId;
      tile: TileId;
      path: readonly TileId[];
      /** They were sitting out lost turns on their chair (see isSeated): they get up to be shoved. */
      seated: boolean;
    }
  /** A trap or curse is about to strike: the player chooses whether to ward it off with their ability. */
  | { type: "wardOffered"; playerId: PlayerId; tile: TileId; threat: Threat }
  /**
   * `by`'s Susanoo threw the player off `tile` to `to`: back, as they tried to stop on her tile, or
   * `ahead`, as she stopped on theirs.
   */
  | { type: "susanooRepelled"; playerId: PlayerId; by: PlayerId; tile: TileId; to: TileId; ahead: boolean }
  | { type: "cardDrawn"; playerId: PlayerId; card: CardInstance }
  /** Transmutation turned the hand card `from` into `to`, in the same place in the hand. */
  /** `from` and `sacrificed` left the hand, `to` took `from`'s place. */
  | {
      type: "cardTransmuted";
      playerId: PlayerId;
      from: CardInstance;
      sacrificed: CardInstance;
      to: CardInstance;
    }
  /** Three copies (`used`) left the hand, fused into `card`. */
  | {
      type: "cardsFused";
      playerId: PlayerId;
      used: readonly string[];
      card: CardInstance;
    }
  /** The deck ran out: the discard pile was shuffled into a new deck. */
  | { type: "deckReshuffled"; playerId: PlayerId; size: number }
  /** Hand was full: the player must pick a card to throw away (the drawn one included). */
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
  /** Knocked back tile by tile (Arcane Blast). */
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
