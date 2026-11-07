import { model, type CharacterDefinition } from "../types";

export const enchantress = {
  name: "Encantadora Carmesim",
  epithet: "Feiticeira de sangue",
  color: "#f43f5e",
  model: model("enchantress"),
  ability: "doubleCast",
  playable: true,
  chair: "roseThrone",
  stage: "bloodRoseGarden",
} as const satisfies CharacterDefinition;
