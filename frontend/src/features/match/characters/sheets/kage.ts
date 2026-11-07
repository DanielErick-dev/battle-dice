import { model, type CharacterDefinition } from "../types";

export const kage = {
  name: "Kage Rubra",
  epithet: "O olhar que queima",
  // Scarlet flame, apart from the crimsons and pinks of the other reds.
  color: "#ff4d2e",
  model: model("kage"),
  chair: "obsidianThrone",
  ability: "ocularAwakening",
  playable: true,
  stage: "burningShrine",
  shieldColor: "#ff4d2e",
  armourLook: "susanoo",
} as const satisfies CharacterDefinition;
