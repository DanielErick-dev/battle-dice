import type { AbilityId } from "@/game/domain/abilities/ability";
import type { AimWard } from "@/game/domain/core/playerStatus";
import type { CardId } from "@/game/domain/cards/catalog";
import type {
  Blessing,
  CardInstance,
  Crown,
  PlayerId,
  RealmKind,
  SealKind,
  SpecterKind,
  TileId,
  TrapCurse,
  TrapWard,
  VoidItem,
} from "@/game/domain/types";

export type TileEffectKind =
  | "portal"
  | "trap"
  | "hiddenTrap"
  | "advance"
  | "extraTurn"
  | "skipTurn"
  | "turnSkipped"
  /** Zarek's Void at work: shown over Zarek. */
  | "voidSwallowed"
  | "riftOpened"
  | "voidCast"
  | "voidSeized"
  | "voidEchoed"
  /** A lost turn in the fairy's snow: `count` energy went to her. */
  | "snowDrained"
  | "trapBlocked"
  | "trapCurse"
  | "realmEnter"
  | "blessing"
  | "teleport"
  | "abilityReady"
  | "abilityUsed"
  | "levitated"
  | "gamble"
  | "seal"
  | "enchanted"
  | "flames"
  /** Shown over the Crystal Fairy. */
  | "winter"
  | "armour"
  | "cleansed"
  /** Shown over the one sent flying. */
  | "trampled"
  /** Kage Rubra's Susanoo threw someone back; shown over the one thrown. */
  | "repelled"
  | "timeBent"
  | "specter"
  /** Seraphiel set foot in hell. */
  | "fallen"
  | "crown"
  /** The Fallen Angel on a celestial portal: heaven stays shut and its chains hold him. */
  | "heavenBarred"
  | "dragged"
  /** Shown over whoever aimed it. */
  | "abilityBlocked"
  /** Themis's Silent Verdict, shown over the one judged. */
  | "verdict"
  /** A Mark of Justice on whoever attacked (or was branded by her card). */
  | "marked"
  /** Blind Justice sets everyone walking; shown over Themis. */
  | "marched"
  /** The Containment Decree caps the opponents' dice; shown over Themis. */
  | "decree"
  /** The Final Judgment's Die of Justice; shown over Themis, `count` the tiles she leaps. */
  | "judgment"
  /** The hourglass ran out on the player: the turn is lost. */
  | "timedOut"
  /** Akane's Fire Zone (or Scarlet Fever's tiles) caught; shown over Akane, `count` the tiles. */
  | "scarletLit"
  /** Someone caught Akane's fire; shown over them. */
  | "ignited"
  /** Water or a herb put the fire out; shown over the first one. */
  | "quenched"
  /** Akane's Inner Flame grew; `count` the flames. */
  | "kindled"
  /** Brilliant Impetus unleashed; `count` the rolls it lasts. */
  | "impetus"
  /** Ember Step slid him on through the fire. */
  | "emberSlid"
  /** Hot Blood's blast; `count` the tiles each was thrown back. */
  | "hotBlood"
  /** Pure Fuel; `count` the rolls. */
  | "fuel"
  /** Ember Step played: waiting on the roll. */
  | "emberStep"
  /** Scarlet Supernova; `count` the tiles he leaps. */
  | "supernova"
  | "weeded"
  | "burntRoll"
  | "fireFed";

/** A tile effect or turn notice; without travel, `from` and `to` are the same tile. */
export interface TileEffectView {
  kind: TileEffectKind;
  playerId: PlayerId;
  from: TileId;
  to: TileId;
  curse?: { kind: TrapCurse; card: CardInstance | null; energyLost: number };
  /** `fortune`: thrown for cards. */
  gamble?: { value: number; won: boolean; fortune?: boolean };
  /** The ability or card turned away, by what, and the opponent it was aimed at. */
  blocked?: {
    ability?: AbilityId;
    cardId?: CardId;
    ward: AimWard | "away";
    targetName: string;
  };
  realm?: RealmKind;
  blessing?: {
    kind: Blessing;
    energyGained: number;
    charged?: boolean;
    turns?: number;
  };
  ward?: { kind: TrapWard; hidden: boolean };
  ability?: { id: AbilityId };
  /** Tiles Cleansing Tide washed, tiles a trample knocked back, or Time Warp's rounds. */
  count?: number;
  crown?: Crown;
  time?: "halt" | "reverse";
  enchanted?: { owner: PlayerId; frozen: number };
  /** Struck by an opponent's card, not a tile: the camera turns to watch them sit down. */
  aimed?: boolean;
  /** Who the snow's energy went to (the fairy, or Zarek on snow he took). */
  drainedBy?: string;
  flames?: { energyLost: number };
  seal?: { kind: SealKind; owner: PlayerId; energyLost: number; energyGained: number };
  /** `kind` null: the Warden's apparitions were dispelled. */
  specter?: {
    kind: SpecterKind | null;
    owner: PlayerId;
    energyTaken: number;
    energyGained: number;
    chargeGained: number;
  };
  /** What the Void swallowed, opened, set down or took; `doubled` for a rift. */
  void?: { item: VoidItem | null; doubled?: boolean };
  /** The judge, what the one judged aimed, and at whom when not at her. */
  verdict?: { judgeName: string; defendedName?: string; cardId?: CardId; ability?: AbilityId };
  /** The Final Judgment: the Die of Justice and the distance it was multiplied by. */
  judgment?: { die: number; distance: number };
}
