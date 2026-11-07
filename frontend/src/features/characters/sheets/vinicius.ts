import { model, type CharacterDefinition } from "../types";

// The user's cousin, put in for a laugh: a farm hand who hoes out any trap he stops on.
export const vinicius = {
  name: "Vinicius",
  epithet: "Capina tudo",
  // Earthy amber, the colour of turned soil.
  color: "#b45309",
  model: model("vinicius"),
  ability: "weeding",
  playable: true,
  holdsHoe: true,
  shieldColor: "#b45309",
  stage: "farmPlot",
} as const satisfies CharacterDefinition;
