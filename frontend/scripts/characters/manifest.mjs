// Clips each character's GLB is built from. Folder layout and naming: docs/assets.md.
// Ids match CHARACTERS in src/features/characters/index.ts and name the source folders.

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
  "strike",
  "fume",
  // Tenzai's four bendings, his Convergence (sitting down, then held) and the reactions everyone borrows from him.
  "quake",
  "tide",
  "flare",
  "gust",
  "meditate",
  "lotus",
  "vault",
  "punch",
  "ouch",
  "limp",
];

// Clips borrowed by everyone without their own (one fall and one way of sitting fit every body).
export const SHARED_CLIPS = {
  knocked: "zarek",
  rest: "auric",
  vault: "zephyr",
  punch: "zephyr",
  ouch: "zephyr",
  limp: "zephyr",
};

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
  // Ends on the arrow's follow-through: the export's last half second slumps into a stiff wide-legged rest pose.
  // Her cast is the same shot, bent over so the arrow goes up into the sky (the volley rains down from it).
  archer: { sequences: { intro: ["shoot@0-3.05"], cast: ["shoot@0-3.05:skyward"] } },
  jester: {},
  necromancer: {},
  scribe: { sequences: { intro: ["write@0-3.85", "arms-up"] } },
  warden: {},
  kage: {},
  fairy: {},
  // Tenzai: the meditation sits down slowly and its last pose is held (lotus) while he floats in his Convergence.
  zephyr: {
    // The Runebound Acolyte body (body.glb); every clip was made on his first body, so all of them live in parts/.
    body: "body",
    retargetParts: true,
    // His menu intro (his own export) hands over to the lotus, held floating (float); the bendings are match clips.
    sequences: {
      idle: ["idle"],
      run: ["run"],
      punch: ["punch"],
      ouch: ["ouch"],
      limp: ["limp"],
      intro: ["intro"],
      float: ["meditate@2.8-2.97"],
      // Sped up: at their own pace the water and wind gestures dragged on for 4–6 s.
      quake: ["quake*1.15"],
      tide: ["tide*1.45"],
      flare: ["flare*1.1"],
      gust: ["gust*1.9"],
      meditate: ["meditate*0.6"],
      lotus: ["meditate@2.8-2.97"],
      // From take-off to landing, quick enough to clear the wall at the tile's start within one step; its forward
      // travel is pinned (IN_PLACE_CLIPS), the walk carries him over.
      vault: ["vault@0.25-1.5*1.6"],
    },
  },
  // Themis: her intro plants the sword in the ground, kneeling, then rises and gestures (the scale appears in
  // her hand, see ThemisIntro); her verdict sweeps the attack aside with her arm. She sits and falls with the
  // shared clips.
  themis: {
    // Her parts were made on the Blindfolded Oracle body; her idle and run are the Lady Justice one's.
    retargetParts: true,
    // The sweep runs 0.4–2.1 s; the rest of the export just stands.
    sequences: { intro: ["sword-plant"], guard: ["negation@0.3-2.4"] },
  },
  // Akane: his intro gets up off his chair (the export sits still until 1.4 s and is up by 3.1) and snaps his fingers
  // (the flick at 0.65 s; cut as the hand comes down, for idle to take over).
  akane: { sequences: { intro: ["stand-up@1.4-3.1", "snap@0.1-1.35"] } },
  // Only the first thrust: the export walks on into a second push.
  bjorn: { sequences: { shove: ["shove@0.05-0.55"] } },
  auric: {},
  seraphiel: {},
  // Seraphiel after the Fall (CharacterDefinition.fallenModel), not a playable character.
  seraphielFallen: {},
  cronos: {},
  // Unidade Alva: switched off, head bowed. Only the bowed stretch of the export (it bows from 0 to 0.87 s and lifts
  // back after 2.1), slowed into a ~1.5 s hold; the intro's crossfade then lifts the neck straight into the idle.
  alva: { sequences: { intro: ["power-on@0.9-1.7*0.45"] } },
  vinicius: {},
};

export const CHARACTER_MODELS = Object.fromEntries(Object.entries(MODELS).map(([id, model]) => [id, { id, ...model }]));
