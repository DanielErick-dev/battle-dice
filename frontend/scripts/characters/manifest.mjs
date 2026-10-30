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

// Clips borrowed by everyone without their own (one fall, one way of sitting and one of slowing to a stop fit every body).
export const SHARED_CLIPS = { knocked: "zarek", rest: "auric", brake: "themis" };

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
  // Themis: one raised hand is both her intro and her pointing at the judged; she slows to a walk on
  // arriving, turns and sits (resting on the sit's last pose); her verdict is a guard, the point and a scoff.
  themis: {
    // Her parts were made on her first model; her idle and run are the Lady Justice one's.
    retargetParts: true,
    sequences: {
      intro: ["raise-hand"],
      cast: ["raise-hand"],
      brake: ["run-to-walk@1.2"],
      sit: ["step-to-sit@2.2"],
      rest: ["step-to-sit@4.7"],
      guard: ["guard@1.2-2.6"],
      scoff: ["scoff@0.4-3.2"],
    },
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
