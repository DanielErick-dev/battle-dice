import { CLASSIC_BOARD, TIME_CHAMBER_BOARD, TOURNAMENT_BOARD, type BoardDefinition } from "@/game/domain/board";

export interface BoardPreset {
  id: string;
  name: string;
  definition: BoardDefinition;
  /** Tiles per row in the 3D layout. */
  columns: number;
}

export const BOARD_PRESETS: readonly BoardPreset[] = [
  { id: "training", name: "Treino", definition: CLASSIC_BOARD, columns: 5 },
  { id: "tournament", name: "Torneio", definition: TOURNAMENT_BOARD, columns: 6 },
  { id: "time-chamber", name: "Sala do Tempo", definition: TIME_CHAMBER_BOARD, columns: 7 },
];

export const DEFAULT_BOARD_ID = BOARD_PRESETS[0].id;

export function boardPresetFor(id: string): BoardPreset {
  return BOARD_PRESETS.find((preset) => preset.id === id) ?? BOARD_PRESETS[0];
}
