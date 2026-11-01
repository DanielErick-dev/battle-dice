import type { CardId } from "@/game/domain/types";
import type { PlayerId } from "@/game/domain/types";

export type TileId = number;

export type TileEffect =
  | { kind: "none" }
  /** Jumps to `to`, or, with a `realm`, opens a side track through that realm that comes out at `to`. */
  | { kind: "portal"; to: TileId; realm?: RealmKind }
  /** Sends the player back to `to`; a `curse` also takes something from them. */
  | { kind: "trap"; to: TileId; curse?: TrapCurse }
  /** Walks forward to `to`, tile by tile. */
  | { kind: "advance"; to: TileId }
  | { kind: "extraTurn" }
  | { kind: "skipTurn" }
  /** With a `cardId` (a celestial relic on the tile), hands that very card instead of a draw. */
  | { kind: "card"; cardId?: CardId }
  /** Realm track tiles: a curse without the knock-back, or a blessing. */
  | { kind: "curse"; curse: TrapCurse }
  | { kind: "blessing"; blessing: Blessing };

/** Side worlds a portal can open into: fire and curses, or light and blessings. */
export type RealmKind = "infernal" | "celestial";

/** TimedBlessings only lie in heaven; "charge" (a turn of ability charge) only on the main path. */
export type Blessing = "energy" | "charge" | "shield" | TimedBlessing;

/** Heaven's blessings, each lasting BLESSING_TURNS rounds (see blessings.ts). */
export type TimedBlessing = "wings" | "halo" | "inspiration" | "spring";

export interface ActiveBlessing {
  kind: TimedBlessing;
  turnsLeft: number;
  /** Received this turn: the turn ending doesn't count towards it. */
  fresh: boolean;
}

/** What a trap takes besides the tiles: a random hand card, or energy. */
export type TrapCurse = "discard" | "drain";

/** What kept a trap, curse or lost-turn tile off a player ("fallen": the Fallen Angel in his own hell). */
export type TrapWard = "shield" | "ability" | "halo" | "untamed" | "susanoo" | "fallen";

/** What's about to strike a player who could swallow it with their Void. */
export type Threat = "trap" | "hiddenTrap" | "curse" | "skipTurn";

/** "rift": a tile Zarek's Void opened into the path mid-match (see characters/zarek/rifts.ts). */
export type TileRole = "start" | "finish" | "regular" | "track" | "rift";

export interface Tile {
  id: TileId;
  role: TileRole;
  effect: TileEffect;
  /** Where walking forward leads; null on the finish. Track tiles lead on to the track's exit. */
  next: TileId | null;
  /** Where being pushed back leads; null on the start. A track's first tile leads back to its portal. */
  previous: TileId | null;
  track?: TrackPlacement;
  rift?: Rift;
}

/** A rift's harm never touches its owner; `doubled` was paid for when it opened. */
export interface Rift {
  owner: PlayerId;
  doubled: boolean;
  /** The tile it opened right after (later rifts there may have come between). */
  after: TileId;
  /** A trap's setback in tiles, doubling included. */
  back?: number;
}

export interface TrackPlacement {
  realm: RealmKind;
  /** The track's first portal when several open onto it (see RealmTrack.entries). */
  portal: TileId;
  index: number;
}

/** One track per realm, shared by every portal into it; each leaves where its own portal leads. */
export interface RealmTrack {
  realm: RealmKind;
  portal: TileId;
  exit: TileId;
  tiles: readonly TileId[];
  /** The first entry is `portal` and `exit`. */
  entries: readonly RealmEntry[];
}

export interface RealmEntry {
  portal: TileId;
  exit: TileId;
}

/** A stretch of plain-looking tiles where `traps` hidden traps spring, then move elsewhere in it. */
export interface TrapZone {
  tiles: readonly TileId[];
  traps: number;
}

export interface Board {
  /** The main path (1 to finishTile) first, then every realm track's tiles. */
  tiles: readonly Tile[];
  startTile: TileId;
  finishTile: TileId;
  tracks: readonly RealmTrack[];
  trapZones: readonly TrapZone[];
}
