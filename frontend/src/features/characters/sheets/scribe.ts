import { model, type CharacterDefinition } from "../types";

export const scribe = {
  name: "Escriba da Carne",
  epithet: "O que ele escreve, você paga",
  // Fuchsia, the glow of his runes; apart from the reds and the Void Knight's violet.
  color: "#d946ef",
  model: model("scribe"),
  chair: "scribeThrone",
  ability: "forbiddenSeals",
  playable: true,
  shieldColor: "#d946ef",
  // His intro: he writes from 0.7 s to 3.3 s, throws his arms up at 4.4 s and lowers them at 7.15 s.
  introSeals: { writeSeconds: 0.7, writtenSeconds: 3.3, raiseSeconds: 4.4, releaseSeconds: 7.15 },
  stage: "scriptorium",
} as const satisfies CharacterDefinition;
