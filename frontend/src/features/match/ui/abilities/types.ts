import type { ComponentType } from "react";
import type { Board, Player } from "@/game/domain/types";
import type { MatchStore } from "../../model/matchStore";
import type { MatchView } from "../../model/matchView";
import type { PickCursor } from "../../scene/pickCursor";

/**
 * Tiles picked on the board: seals, apparitions, Kage Rubra's black fire, the fairy's ice, the spell
 * Zarek's Void takes over ("seize"), or where the Void's `release`th item goes (doubled for energy).
 */
export type Placement = Exclude<PickCursor, "void"> | "seize" | { release: number; doubled: boolean };

/** What an ability is used with: the cards, tiles, opponent or power the player picked. */
export type AbilityChoice = NonNullable<Parameters<MatchStore["activateAbility"]>[0]>;

/** The match as an ability's flow sees it, on the active player's turn. */
export interface AbilityScene {
  board: Board;
  view: MatchView;
  player: Player;
}

/** What a picker can do: use the ability with a choice, move on to picking tiles, or back out. */
export interface AbilityContext extends AbilityScene {
  /** Closes the picker and uses the ability with this choice. */
  use: (choice?: AbilityChoice) => void;
  /** Closes the picker and starts picking tiles on the board. */
  place: (placement: Placement) => void;
  cancel: () => void;
}

/**
 * How an ability that asks something is used, from the "Usar" button on. Abilities without a flow
 * go off straight away.
 */
export interface AbilityFlow {
  /** What "Usar" does first: open the Picker, start picking tiles, or (null) use the ability straight away. */
  start: (scene: AbilityScene) => "picker" | Placement | null;
  Picker?: ComponentType<{ ctx: AbilityContext }>;
}
