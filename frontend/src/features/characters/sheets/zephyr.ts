import { model, type CharacterDefinition } from "../types";

export const zephyr = {
  // Tenzai now; the code id and asset folder kept the old name.
  name: "Tenzai",
  epithet: "O Senhor dos Quatro Elementos",
  // Mint, the colour of a clear gust.
  color: "#86efac",
  model: model("zephyr"),
  ability: "fourElements",
  meditates: true,
  // His bending clips are the show: no generic spin-and-hop on top of them.
  castsStill: true,
  playable: true,
  shieldColor: "#86efac",
  chair: "elementalThrone",
  stage: "peak",
} as const satisfies CharacterDefinition;
