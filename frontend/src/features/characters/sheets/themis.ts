import { model, type CharacterDefinition } from "../types";

export const themis = {
  name: "Têmis",
  epithet: "A Juíza Vendada",
  color: "#2563eb",
  model: model("themis"),
  ability: "silentVerdict",
  playable: true,
  holdsSword: true,
  shieldColor: "#d4af37", // tribunal gold
  chair: "moonThrone",
  // Her intro at a stately pace; the beats follow the clip (fist on the floor at 0.75 s, coming down to her side by 3 s).
  introSpeed: 0.85,
  introSword: { plantSeconds: 0.75, trembleSeconds: 1.6, riseSeconds: 2.45, catchSeconds: 3.0 },
  // Her intro line, as the sword strikes the ground.
  introVoice: { src: "/audio/voices/themis/themis-intro.mp3", seconds: 0.75 },
  stage: "tribunal",
} as const satisfies CharacterDefinition;
