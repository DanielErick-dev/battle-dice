import type { PlayerId, TileId } from "@/game/domain/types";

/** Seraphiel's crown: won coming out of heaven, turned infernal by the Fall. */
export type Crown = "seraphic" | "infernal";

export type SeraphielEvent =
  /** Seraphiel is the Fallen Angel for good. */
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
    };
