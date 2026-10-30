import type { ComponentType, RefObject } from "react";
import type { Object3D, Vector3 } from "three";
import type { Board, Player, PlayerId, TileId } from "@/game/domain/types";
import type { CharacterDefinition } from "../../characters";
import type { CardCastView, MatchView } from "../../model/matchView";
import type { BoardLayout } from "../boardLayout";

/** What the view says a figure is doing now (see tokenSignals). */
export interface TokenSignals {
  /** Leaps in an arc instead of running to its next tile. */
  isTeleporting: boolean;
  /** Its next tile is where its walk ends: it slows to a stop on the way (the brake clip). */
  isArriving: boolean;
  /** Crossing the board as lightning (Dormant Fury): unseen. */
  isDashing: boolean;
  /** Dormant Fury awake, waiting for the roll. */
  isFuryAwake: boolean;
  isActive: boolean;
  isPowered: boolean;
  /** Sits on its chair while it has lost turns (not while snowbound or chained). */
  isResting: boolean;
  /** A fresh id per trample this figure acts out as the Berserker. */
  shove: number | null;
  /** A fresh id per trample (or Susanoo) that sends this figure flying. */
  knocked: number | null;
  /** A fresh id per hop on the Crystal Fairy's own snow. */
  hop: number | null;
  /** Hell's Drag on this figure: held, dragged under, then climbing back out in hell (`over`). */
  dragged: { id: number; phase: "grab" | "sink" | "over" } | null;
  /** The card this player just cast. */
  cast: CardCastView | null;
  /** A fresh id per use of their ability. */
  abilityCast: number | null;
  /** A fresh id when Seraphiel falls. */
  fell: number | null;
  /** A fresh id per verdict Themis passes: she guards, points at the one judged and scoffs at them. */
  verdict: number | null;
}

/** Refs the token's frame loop fills every frame, for the effects that follow its motion. */
export interface TokenLive {
  /** 0 on the ground, 1 hovering. */
  rise: RefObject<number>;
  levitating: RefObject<boolean>;
  seated: RefObject<boolean>;
  /** The cast clip itself is playing (not the hold after it). */
  bladesOut: RefObject<boolean>;
  /** Lightning trails the limbs (into and out of a dash). */
  crackling: RefObject<boolean>;
  charged: RefObject<boolean>;
  /** The hand prop is held, before the cast throws it. */
  propHeld: RefObject<boolean>;
  wandOut: RefObject<boolean>;
}

/** Everything a token effect may need about its figure. */
export interface TokenFx extends TokenSignals {
  player: Player;
  character: CharacterDefinition | null;
  color: string;
  /** Seraphiel after the Fall, drawn charred (no fallen model of his own). */
  charred: boolean;
  /** Filled every frame with the frost wand's tip, in world space. */
  wandTip?: Vector3;
  live: TokenLive;
  /** Set by the frame loop as each one starts, so their bursts fire once and outlive the signal. */
  hopBurst: number | null;
  shoveAt: number | null;
  landing: number | null;
  /** The model has a shove clip (else the Berserker lunges in code). */
  hasShoveClip: boolean;
}

/** Everything a board effect may need. */
export interface BoardFx {
  view: MatchView;
  board: Board;
  layout: BoardLayout;
  /** Sees what their own seals and apparitions are; null shows no secrets. */
  viewerId: PlayerId | null;
  /** The tile's realm track is showing: spells on a sunk track hide with it. */
  shown: (tile: TileId) => boolean;
  /** Each fairy's wand tip, filled by her wand every frame. */
  wandTips: ReadonlyMap<PlayerId, Vector3>;
}

export type TokenEffect = ComponentType<{ token: TokenFx }>;
export type FigureEffect = ComponentType<{ token: TokenFx; figure: Object3D }>;
export type BoardEffect = ComponentType<{ fx: BoardFx }>;
