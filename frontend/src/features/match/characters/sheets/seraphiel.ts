import { model, type CharacterDefinition } from "../types";

export const seraphiel = {
  name: "Seraphiel",
  epithet: "Asas que abençoam o caminho",
  color: "#fef3c7",
  model: model("seraphiel"),
  fallenModel: model("seraphielFallen"),
  ability: "seraphBlessing",
  playable: true,
  shieldColor: "#fde68a",
  wings: "seraph",
  fallenWings: "fallen",
  crown: "seraph",
  fallenCrown: "fallen",
  chair: "celestialThrone",
  fallenChair: "ashenThrone",
  descends: true,
  stage: "sanctuary",
} as const satisfies CharacterDefinition;
