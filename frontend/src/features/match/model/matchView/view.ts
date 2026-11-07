import type { AbilityId } from "@/game/domain/abilities/ability";
import type { GameEvent } from "@/game/domain/core/events";
import type {
  BlackFlame,
  CardInstance,
  EnchantedTile,
  Player,
  PlayerId,
  ScarletFlame,
  SealKind,
  SpecterKind,
  Threat,
  Tile,
  TileId,
  VoidScar,
  Winter,
} from "@/game/domain/types";
import type { TileEffectView } from "./effect";
import type { MatchFx } from "./fx";

export interface LogEntry {
  id: number;
  event: GameEvent;
}

/** The last revealed roll. */
export interface RollView {
  dice: readonly number[];
  /** Oracle Eye: the higher die counts instead of the sum. */
  best: boolean;
  bonus: number;
  /** Applied after the bonus (Dormant Fury: 3). */
  multiplier: number;
  /** On Akane's fire: the total is already halved. */
  halved: boolean;
  total: number;
}

/** A Shadow Warden's apparition; only its owner is shown its `kind`, others see the Warden himself. */
export interface SpecterView {
  tile: TileId;
  owner: PlayerId;
  kind: SpecterKind;
}

/** A closed scroll for everyone; only its owner is shown its `kind`. */
export interface SealView {
  tile: TileId;
  owner: PlayerId;
  kind: SealKind;
}

/** What the screen shows right now. Lags behind the authoritative state while animating. */
export interface MatchView {
  players: readonly Player[];
  activePlayerId: PlayerId;
  movingPlayerId: PlayerId | null;
  /** Null before the first roll. */
  lastRoll: RollView | null;
  isRolling: boolean;
  /** Known from the start of the throw so the 3D die lands on it; the HUD waits for `lastRoll`. */
  roll: { id: number; dice: readonly number[] } | null;
  /** Rolled a 6 or hit an advance tile: charged until their move ends. */
  poweredPlayerId: PlayerId | null;
  effect: TileEffectView | null;
  winnerId: PlayerId | null;
  fx: MatchFx;
  /** To highlight it in the hand. */
  lastDrawnUid: string | null;
  /** Hand overflowed: waiting for this player to discard. */
  pendingDiscard: { playerId: PlayerId; drawn: CardInstance } | null;
  cardsPlayedThisTurn: number;
  /** Used this turn and still in effect. */
  abilityInUse: AbilityId | null;
  /** Waiting on Zarek's choice to let his Void swallow the harm. */
  pendingWard: { playerId: PlayerId; tile: TileId; threat: Threat } | null;
  /** Seraphiel picking a blessing or a relic on a heaven tile. */
  pendingGrace: {
    playerId: PlayerId;
    tile: TileId;
    offer: "blessing" | "relic";
  } | null;
  /** Smashed for good or swallowed by the Void: drawn as rubble. */
  destroyedTraps: readonly TileId[];
  /** Pinned by Arrow Rain until walked past: drawn with arrows stuck in them. */
  pinnedTraps: readonly TileId[];
  seals: readonly SealView[];
  specters: readonly SpecterView[];
  enchantedTiles: readonly EnchantedTile[];
  blackFlames: readonly BlackFlame[];
  scarletFlames: readonly ScarletFlame[];
  winter: Winter | null;
  /** Tiles Zarek's Void opened into the path, in the order they opened (see linkRift). */
  rifts: readonly Tile[];
  /** Tiles the Void marked purple: a harm for everyone but Zarek. */
  voidScars: readonly VoidScar[];
  /** A Warden picking the cards their Plunder apparition takes from `victim`. */
  pendingPlunder: { owner: PlayerId; victim: PlayerId } | null;
  /** The tile a walk ends on: the figure slows to a stop on its way there. */
  walkEnd: { playerId: PlayerId; tile: TileId } | null;
  /** The battle log: events as their animation starts, the latest last (see logStep). */
  log: readonly LogEntry[];
  isAnimating: boolean;
  /** Turns started so far: tells one turn from the next even when the same player plays again (the hourglass). */
  turnCount: number;
  /** A refused move, shown briefly; the id lets a repeated refusal show again. */
  error: { id: number; message: string } | null;
}
