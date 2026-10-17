// Clips each character's GLB is built from. Folder layout and naming: docs/assets.md.
// Ids match CHARACTERS in src/features/match/characters.ts and name the source folders.

export const REQUIRED_CLIPS = ["idle", "run"];
export const OPTIONAL_CLIPS = ["intro", "showcase", "cast", "float", "dash", "land", "shove", "knocked", "rest", "hop"];

// Clips borrowed by everyone without their own (one fall and one way of sitting fit every body).
export const SHARED_CLIPS = { knocked: "voidKnight", rest: "goldenGuardian" };

// `sequences` build a clip from files in parts/, played back to back (syntax: docs/assets.md).
const MODELS = {
  voidKnight: {
    sequences: { knocked: ["fall@0-1.3:grounded", "stand-up@1.5-6.4*1.4:grounded"] },
  },
  crimsonEnchantress: {},
  crimsonWitch: {},
  emeraldAlchemist: {},
  wanderingSage: {
    sequences: { intro: ["sway", "spin"], dash: ["lunge@0.4"], land: ["landing@0.85"] },
  },
  elvenArcher: {},
  cardJester: {},
  boneShaman: {},
  fleshScribe: { sequences: { intro: ["write@0-3.85", "arms-up"] } },
  shadowWarden: {},
  purgatoryKunoichi: {},
  crystalFairy: {},
  windGuardian: {},
  tideMaiden: {},
  crimsonStudent: {},
  // Only the first thrust: the export walks on into a second push.
  frostfangBerserker: { sequences: { shove: ["shove@0.05-0.55"] } },
  goldenGuardian: {},
  seraphGuardian: {},
  // Seraphiel after the Fall (CharacterDefinition.fallenModel), not a playable character.
  fallenSeraph: {},
  clockworkSentinel: {},
  sentinelMech: {},
};

export const CHARACTER_MODELS = Object.fromEntries(Object.entries(MODELS).map(([id, model]) => [id, { id, ...model }]));
