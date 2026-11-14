import { model, type CharacterDefinition } from "../types";

export const alchemist = {
  name: "Alquimista Esmeralda",
  epithet: "Mestra das transmutações",
  color: "#10b981",
  model: model("alchemist"),
  chair: "alchemistThrone",
  ability: "transmutation",
  playable: true,
  shieldColor: "#10b981",
  handProp: "vial",
  stage: "alchemyLab",
  // The vial leaves her belt at 0.9 s and her hand at 2.3 s, when the swing is fastest.
  castPropSeconds: 0.9,
  castImpactSeconds: 2.3,
  // Her arm is out in front of her by then (tune by eye on the menu).
  introPourSeconds: 2.0,
} as const satisfies CharacterDefinition;
