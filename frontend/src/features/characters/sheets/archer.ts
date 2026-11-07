import { model, type CharacterDefinition } from "../types";

export const archer = {
  name: "Arqueira Élfica",
  epithet: "Flechas que caem do céu",
  // Leaf green, lighter and yellower than the Alchemist's emerald.
  color: "#84cc16",
  model: model("archer"),
  chair: "elderwoodThrone",
  ability: "arrowRain",
  bow: true,
  // Her cast is her intro's shot bent up at the sky (see the manifest's skyward): the arrow flies at 2.65 s.
  castImpactSeconds: 2.65,
  playable: true,
  shieldColor: "#84cc16",
  // Her intro: the bow comes up from 0.6 s, drawn and held, the arrow loosed at 2.65 s.
  introArrows: { drawSeconds: 0.6, releaseSeconds: 2.65 },
  stage: "glade",
} as const satisfies CharacterDefinition;
