import { freezableTiles, frozenTiles } from "@/game/domain/fairy";
import { flammableTiles } from "@/game/domain/kunoichi";
import { sealableTiles, sealedTiles } from "@/game/domain/seals";
import { hauntableTiles, takenForSpecters } from "@/game/domain/specters";
import { getTile } from "@/game/domain/board";
import type { TileId } from "@/game/domain/types";
import { riftAnchors, spellGround, spellTiles } from "@/game/domain/void";
import type { MatchStore } from "../../model/matchStore";
import type { PickCursor } from "../../scene/pickCursor";
import { isVoidHarm, voidItemName } from "../voidText";
import {
  FLAME_STEPS,
  FROST_STEPS,
  SEAL_STEPS,
  SPECTER_STEPS,
  VOID_SEIZE_STEP,
  voidReleaseStep,
  type PlacementStep,
} from "../placementText";
import type { AbilityChoice, AbilityFlow, AbilityScene, Placement } from "./types";

/** Picking tiles on the board for an ability: what's asked, where it may go, and what the picks are used as. */
export interface PlacementSpec {
  title: string;
  tone: string;
  steps: readonly PlacementStep[];
  tiles: TileId[];
  confirmLabel: string;
  /** The pointer over a pickable tile. */
  cursor: PickCursor;
  /** Sends the picks: as the ability's choice, or as the Void setting something down. */
  send: (store: MatchStore, tiles: TileId[]) => void;
}

/** Picks used as the ability's choice. */
const activating =
  (choice: (tiles: TileId[]) => AbilityChoice) =>
  (store: MatchStore, tiles: TileId[]): void =>
    store.activateAbility(choice(tiles));

export function placementOf(placement: Placement, scene: AbilityScene): PlacementSpec {
  const { board, view, player } = scene;
  if (typeof placement === "object") return releaseOf(placement, scene);
  switch (placement) {
    case "seals":
      return {
        title: "Escritura dos 4 Selos",
        tone: "text-fuchsia-300",
        steps: SEAL_STEPS,
        tiles: sealableTiles(board, player.position, [
          ...sealedTiles(view.seals),
          ...view.specters.map((specter) => specter.tile),
        ]),
        confirmLabel: "Escrever selos",
        cursor: "seals",
        send: activating((sealTiles) => ({ sealTiles })),
      };
    case "specters":
      return {
        title: "Aparições Espectrais",
        tone: "text-sky-300",
        steps: SPECTER_STEPS,
        tiles: hauntableTiles(board, player.position, takenForSpecters(view.seals, view.specters)),
        confirmLabel: "Invocar aparições",
        cursor: "specters",
        send: activating((specterTiles) => ({ specterTiles })),
      };
    case "flames":
      return {
        title: "Chamas Eternas",
        tone: "text-orange-400",
        steps: FLAME_STEPS,
        tiles: flammableTiles(board, player.position, [
          ...view.blackFlames.map((flame) => flame.tile),
          ...frozenTiles(view.winter, board.startTile),
        ]),
        confirmLabel: "Incendiar",
        cursor: "flames",
        send: activating((flameTiles) => ({ power: "flames", flameTiles })),
      };
    case "frost":
      return {
        title: "Inverno Eterno",
        tone: "text-sky-300",
        steps: FROST_STEPS,
        tiles: freezableTiles(board, player.position, view.winter, view.enchantedTiles),
        confirmLabel: "Congelar",
        cursor: "frost",
        send: activating((frostTiles) => ({ frostTiles })),
      };
    case "seize":
      return {
        title: "O Vazio toma",
        tone: "text-violet-300",
        steps: [VOID_SEIZE_STEP],
        tiles: spellTiles(view).filter((tile) => getTile(board, tile).role === "regular"),
        confirmLabel: "Tomar",
        cursor: "void",
        send: activating(([seizeTile]) => ({ seizeTile })),
      };
  }
}

/** Zarek sets down the Void's `release`th item: a harm opens a rift after the tile, a spell lands on it. */
function releaseOf({ release, doubled }: { release: number; doubled: boolean }, scene: AbilityScene): PlacementSpec {
  const { board, view, player } = scene;
  const item = player.voidHold[release];
  const harm = item !== undefined && isVoidHarm(item);
  const name = item ? voidItemName(item) : "";
  return {
    title: harm ? "Abrir fenda" : "Soltar do Vazio",
    tone: "text-violet-300",
    steps: [voidReleaseStep(name, harm, doubled)],
    tiles: !item ? [] : harm ? riftAnchors(board) : spellGround({ ...view, board }),
    confirmLabel: harm ? "Abrir fenda" : "Soltar",
    cursor: "void",
    send: (store, [tile]) => store.placeVoid(release, tile, doubled),
  };
}

/** O Vazio: from the button only once idle long enough, to take over a spell on the board. */
export const theVoid: AbilityFlow = { start: () => "seize" };

/** Florescimento Feérico: snow on the harm ahead; once Eternal Winter has begun, ice on tiles she picks. */
export const fairyBloom: AbilityFlow = { start: ({ view }) => (view.winter ? "frost" : null) };

/** Escritura dos 4 Selos: the scribe picks a tile for each seal. */
export const forbiddenSeals: AbilityFlow = { start: () => "seals" };

/** Aparições Espectrais: the warden picks a tile for each apparition. */
export const spectralApparitions: AbilityFlow = { start: () => "specters" };
