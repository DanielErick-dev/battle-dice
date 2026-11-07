import { model, type CharacterDefinition } from "../types";

export const alva = {
  name: "Unidade Alva",
  epithet: "Alvo travado",
  color: "#e2e8f0",
  model: model("alva"),
  ability: "plasmaCannon",
  playable: true,
  shieldColor: "#e2e8f0",
  chair: "cyberThrone",
  stage: "hangar",
} as const satisfies CharacterDefinition;
