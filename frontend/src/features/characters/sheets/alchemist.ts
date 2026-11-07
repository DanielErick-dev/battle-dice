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
  // Her cast: the vial comes off her belt at 0.9 s, is wound up behind her shoulder and
  // leaves her hand at 2.3 s, when the hand swings forward fastest.
  castPropSeconds: 0.9,
  castImpactSeconds: 2.3,
  // Her arm is out in front of her by then (tune by eye on the menu).
  introPourSeconds: 2.0,
} as const satisfies CharacterDefinition;
