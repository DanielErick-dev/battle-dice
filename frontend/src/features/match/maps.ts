/** The worlds a match can be played in: the same rules and tiles, only the scenery changes. */
export interface MapPreset {
  id: MapId;
  name: string;
  /** One line for the picker. */
  description: string;
}

export type MapId = "island" | "dungeon" | "wasteland";

export const MAP_PRESETS: readonly MapPreset[] = [
  {
    id: "island",
    name: "Ilha Encantada",
    description: "Da vila ao castelo, passando pela floresta e pelo riacho, com o mar em volta.",
  },
  {
    id: "dungeon",
    name: "Masmorra",
    description: "Salões de pedra à luz de tochas, onde esqueletos guardam tesouros.",
  },
  {
    id: "wasteland",
    name: "Terra Devastada",
    description: "Uma cidade em ruínas depois do fim do mundo, carros abandonados e silêncio.",
  },
];

export const DEFAULT_MAP_ID: MapId = "island";

export function mapPresetFor(id: string): MapPreset {
  return MAP_PRESETS.find((preset) => preset.id === id) ?? MAP_PRESETS[0];
}
