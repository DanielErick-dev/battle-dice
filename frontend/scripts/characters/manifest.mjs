/**
 * Where each character's Meshy exports live: `folder` is its subfolder of the source folder
 * (see build-characters.mjs), holding one export per clip, named after the clip the game plays
 * (CharacterClip in src/features/match/characters.ts). `idle.glb` and `run.glb` are required;
 * the rest are used when there: `intro.glb` plays once on the menus as the character is
 * picked, then `showcase.glb` loops to present them (they idle without one), `cast.glb` plays
 * once as they use their ability (without it, the figure leaps), `float.glb` loops while they
 * levitate (they idle without one).
 * `fallbacks` borrow a required clip from another character (by id) until the own export exists.
 * The ids match CHARACTERS in src/features/match/characters.ts.
 */
export const REQUIRED_CLIPS = ["idle", "run"];
export const OPTIONAL_CLIPS = ["intro", "showcase", "cast", "float"];

export const CHARACTER_MODELS = {
  voidKnight: { folder: "cavaleiro-do-vazio" },
  crimsonEnchantress: { folder: "encantadora-carmesim" },
  eclipseQueen: { folder: "rainha-do-eclipse" },
  blindSeraph: { folder: "serafim-vendado" },
  rosewingDragoness: { folder: "dragoa-das-rosas", fallbacks: { idle: "crimsonEnchantress" } },
  // She levitates on the menus too, so her float doubles as her showcase.
  crimsonWitch: { folder: "bruxa-carmesim" },
};
