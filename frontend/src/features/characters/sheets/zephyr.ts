import { model, type CharacterDefinition } from "../types";

export const zephyr = {
  name: "Zéfiro",
  epithet: "O vento sempre a favor",
  // Mint, the colour of a clear gust.
  color: "#86efac",
  model: model("zephyr"),
  ability: "tailwind",
  playable: true,
  shieldColor: "#86efac",
  chair: "elementalThrone",
  stage: "peak",
} as const satisfies CharacterDefinition;
