import { model, type CharacterDefinition } from "../types";

export const zarek = {
  name: "Zarek",
  epithet: "O Cavaleiro do Vazio",
  color: "#8b5cf6",
  model: model("zarek"),
  ability: "theVoid",
  playable: true,
  chair: "amethystThrone",
  stage: "voidRift",
  energyBlades: true,
  // Both blades hit the ground as he drops to one knee.
  castImpactSeconds: 0.95,
} as const satisfies CharacterDefinition;
