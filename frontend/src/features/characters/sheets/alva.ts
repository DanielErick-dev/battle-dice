import { model, type CharacterDefinition } from "../types";

export const alva = {
  name: "Unidade Alva",
  epithet: "Alvo travado",
  color: "#e2e8f0",
  model: model("alva"),
  ability: "empPulse",
  playable: true,
  shieldColor: "#e2e8f0",
  chair: "cyberThrone",
  stage: "hangar",
  // Powered up as she lifts her head, with the hangar's lights (its POWER_OFF_SECONDS).
  bodyEnergy: { delaySeconds: 1.5 },
} as const satisfies CharacterDefinition;
