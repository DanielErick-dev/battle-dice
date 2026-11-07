import { model, type CharacterDefinition } from "../types";

export const jester = {
  name: "Coringa Carmesim",
  epithet: "Quem aposta, arrisca",
  // Deep crimson, darker than the Witch's red.
  color: "#dc143c",
  model: model("jester"),
  chair: "jesterThrone",
  ability: "cardGamble",
  playable: true,
  shieldColor: "#dc143c",
  stage: "cardTable",
  // Her intro: a crouch, a pirouette from 1.5 s, then a pose with a hand held up from about 2.7 s.
  introCards: { spinSeconds: 1.5, revealSeconds: 2.7 },
} as const satisfies CharacterDefinition;
