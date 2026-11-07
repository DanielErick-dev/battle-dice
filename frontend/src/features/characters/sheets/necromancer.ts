import { model, type CharacterDefinition } from "../types";

export const necromancer = {
  name: "Necromante",
  epithet: "O que foi jogado não morre",
  // Ghostly teal, the glow of spirits called back.
  color: "#2dd4bf",
  model: model("necromancer"),
  chair: "necromancerThrone",
  ability: "resurrection",
  playable: true,
  shieldColor: "#2dd4bf",
  // His intro: the arms rise from 0.5 s, are up from 1.4 s and come down from 2.9 s.
  introBones: { raiseSeconds: 0.5, peakSeconds: 1.4, releaseSeconds: 2.9 },
  stage: "graveyard",
} as const satisfies CharacterDefinition;
