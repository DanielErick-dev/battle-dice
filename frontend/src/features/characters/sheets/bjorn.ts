import { model, type CharacterDefinition } from "../types";

export const bjorn = {
  name: "Bjorn Presa-Gélida",
  epithet: "Quem fica no caminho, voa",
  color: "#60a5fa",
  model: model("bjorn"),
  ability: "untamed",
  chair: "wolfThrone",
  playable: true,
  shieldColor: "#60a5fa",
  // His intro: the left fist goes up from 0.3 s and slams the ground at 1 s.
  introFrost: { raiseSeconds: 0.3, impactSeconds: 1 },
  // His cast: the fists come up onto his chest by 0.8 s. His shove: the hands hit at 0.25 s.
  castImpactSeconds: 0.8,
  shoveImpactSeconds: 0.25,
  castAura: "frost",
  stage: "tundra",
} as const satisfies CharacterDefinition;
