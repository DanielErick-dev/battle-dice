import type { TileId } from "../../board/types";
import type { PlayerId } from "../../core/ids";

/** A tile set alight by Akane's scarlet fire (Fire Zone, Scarlet Fever). */
export interface ScarletFlame {
  tile: TileId;
  owner: PlayerId;
  /** Counted down as its owner's turns end. */
  turnsLeft: number;
}

export type AkaneEvent =
  /** `tiles` caught scarlet fire; `melted` were under the fairy's snow or ice, gone with it. */
  /** `zone`: his Fire Zone, the fire racing down the path from him (else a card's fire). */
  | { type: "scarletLit"; playerId: PlayerId; tiles: readonly TileId[]; melted: readonly TileId[]; zone?: boolean }
  | { type: "scarletFaded"; owner: PlayerId; tiles: readonly TileId[] }
  /** `playerId` is on fire for `rounds` own turns (rolls halved, no energy); `tile` when the fire was underfoot. */
  | { type: "playerIgnited"; playerId: PlayerId; by: PlayerId; rounds: number; tile?: TileId }
  /** Put out (the tide, a healing herb, the Supernova taking it back). */
  | { type: "fireQuenched"; playerIds: readonly PlayerId[]; by: PlayerId }
  /** Inner Flame went up to `flames` after a low die or a trap. */
  | { type: "innerFlameKindled"; playerId: PlayerId; flames: number }
  /** Brilliant Impetus: his next `rolls` rolls walk IMPETUS_BONUS further and scorch whoever is in the way. */
  | { type: "impetusUnleashed"; playerId: PlayerId; rolls: number }
  /** Ember Step: he stopped on fire and slides on; a playerMoved follows. */
  | { type: "emberSlid"; playerId: PlayerId; tile: TileId }
  /** Hot Blood: opponents within reach are thrown back `tiles` each (playerPushed follow); his flames are spent. */
  | { type: "hotBloodBurst"; playerId: PlayerId; flames: number; tiles: number; targetIds: readonly PlayerId[] }
  /** Pure Fuel: for his next `rolls` rolls, two dice whenever an opponent burns. */
  | { type: "fuelPoured"; playerId: PlayerId; rolls: number }
  /** A round on fire: `energy` went from the one burning to the Akane who lit them (he gains FIRE_TOLL regardless). */
  | { type: "fireFed"; playerId: PlayerId; by: PlayerId; energy: number }
  /** Ember Step played: his roll this turn slides on if it stops on fire. */
  | { type: "emberStepReady"; playerId: PlayerId }
  /** Scarlet Supernova: every fire taken back, `tiles` walked for `fires` tiles and `burning` opponents. */
  | { type: "supernova"; playerId: PlayerId; fires: number; burning: number; tiles: number };
