import { model, type CharacterDefinition } from "../types";

export const fairy = {
  name: "Fada Cristalina",
  epithet: "O encanto que cura o caminho",
  // Bright cyan, the glint of her crystals; brighter and greener than the Warden's blue.
  color: "#22d3ee",
  model: model("fairy"),
  ability: "fairyBloom",
  playable: true,
  shieldColor: "#22d3ee",
  wand: true,
  // Her intro: she raises her left hand from 0.4 s and gazes at it, lowering it again by 2.7 s.
  introWand: { hand: "LeftHand", from: 0.6, to: 2.7 },
  // Her hop on her own snow: a crouch, off the ground at 1.1 s, highest at 1.4 s, down at 1.8 s.
  hopTakeoffSeconds: 1.1,
  wings: "fairy",
  chair: "frostThrone",
  stage: "grove",
} as const satisfies CharacterDefinition;
