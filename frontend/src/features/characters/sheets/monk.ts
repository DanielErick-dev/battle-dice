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
  // His intro (put together by the build, see manifest.mjs) is a capoeira ginga and a spinning
  // jump: the lightning follows every swing of his limbs. Using Dormant Fury, he stands charging
  // until the roll; out of the dash he drops from the sky and touches down 0.4 s into his land clip.
  limbLightning: true,
  // The spinning jump touches down 4.8 s into the intro clip (2.8 s of ginga, then 2 s of jump),
  // played a third faster.
  introSpeed: 1.35,
  introStrikeSeconds: 4.8,
  castsStill: true,
  landImpactSeconds: 0.4,
} as const satisfies CharacterDefinition;
