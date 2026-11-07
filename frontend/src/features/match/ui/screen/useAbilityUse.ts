import { useTurnState } from "@/lib/useTurnState";
import type { Board, Player, TileId } from "@/game/domain/types";
import type { MatchStore } from "../../model/matchStore";
import { canActivateAbility, canRoll, type MatchView } from "../../model/matchView";
import type { BoardPicking } from "../../scene/board/pickCursor";
import { ABILITY_FLOWS, placementOf, type AbilityContext, type AbilityScene, type Placement } from "../abilities";

const NO_TILES: TileId[] = [];

/** Using the active player's ability: its picker, the tiles being picked on the board, and what those send. */
export function useAbilityUse(store: MatchStore, view: MatchView, board: Board, activePlayer: Player | undefined) {
  // These choices belong to the turn they're made on: the next player starts with none of them.
  /** An ability's picker is open (whom to aim at, which power or cards: see ui/abilities). */
  const [choosing, setChoosing] = useTurnState(false, view.activePlayerId);
  /** Picking tiles on the board for an ability (seals, apparitions, black fire), and those picked so far. */
  const [placing, setPlacing] = useTurnState<Placement | null>(null, view.activePlayerId);
  const [picked, setPicked] = useTurnState<TileId[]>(NO_TILES, view.activePlayerId);
  const stopPlacing = () => {
    setPlacing(null);
    setPicked([]);
  };
  const undoPick = () => setPicked((current) => current.slice(0, -1));
  const ability = activePlayer?.ability ?? null;
  const flow = ability ? ABILITY_FLOWS[ability] : undefined;
  const scene: AbilityScene | null = activePlayer ? { board, view, player: activePlayer } : null;
  const abilityCtx: AbilityContext | null = scene && {
    ...scene,
    use: (choice) => {
      setChoosing(false);
      store.activateAbility(choice);
    },
    place: (placement) => {
      setChoosing(false);
      setPlacing(placement);
    },
    cancel: () => setChoosing(false),
  };
  const activateAbility = () => {
    const first = scene && flow ? flow.start(scene) : null;
    if (first === "picker") setChoosing(true);
    else if (first) setPlacing(first);
    else store.activateAbility();
  };
  // Setting the Void's things down needs no charge, only the player's moment to act.
  const canPlace = placing !== null && (typeof placing === "object" ? canRoll(view) : canActivateAbility(view));
  const placement = placing && scene && canPlace ? placementOf(placing, scene) : null;
  const picking: BoardPicking | null = placement && {
    tiles: new Set(
      picked.length < placement.steps.length ? placement.tiles.filter((tile) => !picked.includes(tile)) : [],
    ),
    picked: picked.map((tile, index) => ({
      tile,
      tag: placement.steps[index].tag,
      color: placement.steps[index].color,
    })),
    onPick: (tile) => setPicked((current) => (current.includes(tile) ? current : [...current, tile])),
    cursor: placement.cursor,
  };
  const releaseVoidItem = (release: number, doubled: boolean) => setPlacing({ release, doubled });
  return {
    choosing,
    AbilityPicker: flow?.Picker,
    abilityCtx,
    activateAbility,
    releaseVoidItem,
    placement,
    picking,
    picked,
    undoPick,
    stopPlacing,
  };
}
