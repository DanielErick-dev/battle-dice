import { model, type CharacterDefinition } from "../types";

export const cronos = {
  name: "Cronos",
  epithet: "O tempo gira a seu favor",
  color: "#b45309",
  model: model("cronos"),
  ability: "timeWarp",
  playable: true,
  shieldColor: "#d97706",
  chair: "clockworkThrone",
  stage: "gearworks",
} as const satisfies CharacterDefinition;
