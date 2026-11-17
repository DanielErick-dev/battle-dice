"use client";

import type { CharacterId } from "@/features/characters";
import type { BoardLayout } from "@/features/shared/board/boardLayout";
import type { MapId } from "@/features/shared/presets/maps";
import { MORTAL_HORIZON } from "../realm/mix/palette";
import { Dungeon } from "./dungeon/Dungeon";
import { IslandWorld } from "./island/IslandWorld";
import { Wasteland } from "./wasteland/Wasteland";

/** Colour where sky meets sea; the scene fog uses it too so the water fades into the horizon. */
export const HORIZON_COLOR = MORTAL_HORIZON;

interface ArenaEnvironmentProps {
  layout: BoardLayout;
  /** Which world (see maps.ts). */
  mapId: MapId;
  /** Board size relative to the training board (see boardScaleFor). */
  scale: number;
  /** Characters in the match: the island raises their landmarks. */
  characters: readonly CharacterId[];
}

/**
 * Everything around the trail, by map: the island in the night sea, the dungeon's hall or the ruined city (see
 * maps.ts); the sky and its realm changes go with the island.
 */
export function ArenaEnvironment({ layout, scale, mapId, characters }: ArenaEnvironmentProps) {
  if (mapId === "dungeon") return <Dungeon trail={layout.trail} />;
  if (mapId === "wasteland") return <Wasteland trail={layout.trail} />;
  return <IslandWorld layout={layout} scale={scale} characters={characters} />;
}
