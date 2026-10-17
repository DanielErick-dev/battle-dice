import { flammableTiles } from "@/game/domain/kunoichi";
import { sealableTiles, sealedTiles } from "@/game/domain/seals";
import { hauntableTiles, takenForSpecters } from "@/game/domain/specters";
import type { TileId } from "@/game/domain/types";
import { FLAME_STEPS, SEAL_STEPS, SPECTER_STEPS, type PlacementStep } from "../placementText";
import type { AbilityChoice, AbilityFlow, AbilityScene, Placement } from "./types";

/** Picking tiles on the board for an ability: what's asked, where it may go, and what the picks are used as. */
export interface PlacementSpec {
  title: string;
  tone: string;
  steps: readonly PlacementStep[];
  tiles: TileId[];
  confirmLabel: string;
  choice: (tiles: TileId[]) => AbilityChoice;
}

export function placementOf(placement: Placement, { board, view, player }: AbilityScene): PlacementSpec {
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
        choice: (sealTiles) => ({ sealTiles }),
      };
    case "specters":
      return {
        title: "Aparições Espectrais",
        tone: "text-sky-300",
        steps: SPECTER_STEPS,
        tiles: hauntableTiles(board, player.position, takenForSpecters(view.seals, view.specters)),
        confirmLabel: "Invocar aparições",
        choice: (specterTiles) => ({ specterTiles }),
      };
    case "flames":
      return {
        title: "Chamas Eternas",
        tone: "text-orange-400",
        steps: FLAME_STEPS,
        tiles: flammableTiles(
          board,
          player.position,
          view.blackFlames.map((flame) => flame.tile),
        ),
        confirmLabel: "Incendiar",
        choice: (flameTiles) => ({ power: "flames", flameTiles }),
      };
  }
}

/** Escritura dos 4 Selos: the scribe picks a tile for each seal. */
export const forbiddenSeals: AbilityFlow = { start: () => "seals" };

/** Aparições Espectrais: the warden picks a tile for each apparition. */
export const spectralApparitions: AbilityFlow = { start: () => "specters" };
