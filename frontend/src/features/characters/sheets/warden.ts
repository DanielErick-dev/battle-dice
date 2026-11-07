import { model, type CharacterDefinition } from "../types";

export const warden = {
  name: "Guardião das Sombras",
  epithet: "Sem rosto, sem rastro",
  // Ghostly blue, the glow of his apparitions.
  color: "#7dd3fc",
  model: model("warden"),
  ability: "spectralApparitions",
  playable: true,
  chair: "shadowThrone",
  stage: "mistRuins",
  shieldColor: "#7dd3fc",
} as const satisfies CharacterDefinition;
