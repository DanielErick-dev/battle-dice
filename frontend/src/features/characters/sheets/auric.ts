import { model, type CharacterDefinition } from "../types";

export const auric = {
  name: "Auric",
  epithet: "Senhor das marés douradas",
  color: "#f59e0b",
  model: model("auric"),
  chair: "tideThrone",
  ability: "cleansingTide",
  playable: true,
  shieldColor: "#f59e0b",
  stage: "sunkenTemple",
} as const satisfies CharacterDefinition;
