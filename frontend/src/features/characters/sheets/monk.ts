import { model, type CharacterDefinition } from "../types";

export const monk = {
  name: "Monge Ancião",
  epithet: "A calma antes da tempestade",
  color: "#facc15",
  model: model("monk"),
  chair: "stormThrone",
  stage: "temple",
  ability: "dormantFury",
  playable: true,
  shieldColor: "#facc15",
  // Out of the dash he drops from the sky and touches down 0.4 s into his land clip.
  limbLightning: true,
  // Touchdown is 4.8 s into the clip (2.8 s ginga, 2 s jump), which plays a third faster.
  introSpeed: 1.35,
  introStrikeSeconds: 4.8,
  castsStill: true,
  landImpactSeconds: 0.4,
} as const satisfies CharacterDefinition;
