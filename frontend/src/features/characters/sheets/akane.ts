import { model, type CharacterDefinition } from "../types";

/** His intro plays this much slower than its clip: cut tight, it rushed. */
const AKANE_INTRO_SPEED = 0.78;

export const akane = {
  name: "Akane",
  epithet: "O Prodígio Escarlate",
  // Flame orange, kept apart from Kage Rubra's scarlet.
  color: "#f97316",
  model: model("akane"),
  ability: "fireZone",
  playable: true,
  handFlame: true,
  // His cast pitches a fireball off to his left at 1.6 s: turned a quarter round, it flies down the path.
  castImpactSeconds: 1.6,
  castTurn: -Math.PI / 2,
  // His intro, slowed down a touch: he gets up off his chair from 0.9 s into the clip and snaps his fingers at 2.65 s
  // (measured on the built clip), stretched by the slower playback.
  introSpeed: AKANE_INTRO_SPEED,
  introChair: { riseSeconds: 0.9 / AKANE_INTRO_SPEED, snapSeconds: 2.65 / AKANE_INTRO_SPEED },
  shieldColor: "#f97316",
  chair: "infernalThrone",
  stage: "sakuraCourtyard",
} as const satisfies CharacterDefinition;
