import { model, type CharacterDefinition } from "../types";

export const witch = {
  name: "Bruxa Carmesim",
  epithet: "Senhora dos feitiços de sangue",
  color: "#ef4444",
  model: model("witch"),
  chair: "crimsonThrone",
  ability: "levitation",
  playable: true,
  levitates: true,
  shieldColor: "#ef4444",
  stage: "witchHollow",
} as const satisfies CharacterDefinition;
