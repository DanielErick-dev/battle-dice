// Clips each character's GLB is built from. Folder layout and naming: docs/assets.md.
// Ids match CHARACTERS in src/features/match/characters.ts and name the source folders.

export const REQUIRED_CLIPS = ["idle", "run"];
export const OPTIONAL_CLIPS = [
  "intro",
  "showcase",
  "cast",
  "float",
  "dash",
  "land",
  "shove",
  "knocked",
  "rest",
  "hop",
  "brake",
  "sit",
  "guard",
  "scoff",
];

// Clips borrowed by everyone without their own (one fall and one way of sitting fit every body).
export const SHARED_CLIPS = { knocked: "zarek", rest: "auric" };

// `sequences` build a clip from files in parts/, played back to back (syntax: docs/assets.md).
const MODELS = {
  zarek: {
    sequences: { knocked: ["fall@0-1.3:grounded", "stand-up@1.5-6.4*1.4:grounded"] },
  },
  enchantress: {},
  witch: {},
  alchemist: {},
  monk: {
    sequences: { intro: ["sway", "spin"], dash: ["lunge@0.4"], land: ["landing@0.85"] },
  },
  archer: {},
  jester: {},
  necromancer: {},
  scribe: { sequences: { intro: ["write@0-3.85", "arms-up"] } },
  warden: {},
  kage: {},
  fairy: {},
  zephyr: {},
  // Themis: her intro plants the sword in the ground, kneeling, then rises and gestures (the scale appears in
  // her hand, see ThemisIntro); her verdict sweeps the attack aside with her arm. She sits and falls with the
  // shared clips.
  themis: {
    // Her parts were made on the Blindfolded Oracle body; her idle and run are the Lady Justice one's.
    retargetParts: true,
    // The sweep runs 0.4–2.1 s; the rest of the export just stands.
    sequences: { intro: ["sword-plant"], guard: ["negation@0.3-2.4"] },
  },
  akane: {},
  // Only the first thrust: the export walks on into a second push.
  bjorn: { sequences: { shove: ["shove@0.05-0.55"] } },
  auric: {},
  seraphiel: {},
  // Seraphiel after the Fall (CharacterDefinition.fallenModel), not a playable character.
  seraphielFallen: {},
  cronos: {},
  alva: {},
};

export const CHARACTER_MODELS = Object.fromEntries(Object.entries(MODELS).map(([id, model]) => [id, { id, ...model }]));
