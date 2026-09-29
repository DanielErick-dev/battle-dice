/**
 * Which Meshy exports make up each character: `folder` is its subfolder of the source folder
 * (see build-characters.mjs), `prefix` is the file name before the clip, and
 * each clip maps the name the game plays (CharacterClip in src/features/match/characters.ts)
 * to the export's suffix. `clips` must all exist; `optional` ones are used when exported:
 * "intro" plays once on the menus as the character is picked, then "showcase" loops to
 * present them (it idles without one), "cast"
 * plays once as they use their ability (without it, the figure leaps).
 * `fallbacks` borrow a required clip from another character (by id) until the own export exists.
 * The ids match CHARACTERS in src/features/match/characters.ts.
 */
export const CHARACTER_MODELS = {
  voidKnight: {
    folder: "cavaleiro-do-vazio",
    prefix: "Meshy_AI_Void_Warden",
    clips: { idle: "Short_Breathe_and_Loo", run: "Run_02" },
    optional: { intro: "Sword_Judgment", showcase: "Showcase", cast: "Cast" },
  },
  crimsonEnchantress: {
    folder: "encantadora-carmesim",
    prefix: "Meshy_AI_Crimson_Vanguard",
    clips: { idle: "Short_Breathe_and_Loo", run: "Running" },
    optional: { intro: "Intro", showcase: "Showcase", cast: "Cast" },
  },
  eclipseQueen: {
    folder: "rainha-do-eclipse",
    prefix: "Meshy_AI_Crimson_Eclipse_Queen",
    clips: { idle: "Alert", run: "Running" },
    optional: { intro: "Intro", showcase: "Showcase", cast: "Cast" },
  },
  blindSeraph: {
    folder: "serafim-vendado",
    prefix: "Meshy_AI_Blind_Seraphim",
    clips: { idle: "Alert", run: "Running" },
    optional: { intro: "Intro", showcase: "Showcase", cast: "Cast" },
  },
  rosewingDragoness: {
    folder: "dragoa-das-rosas",
    prefix: "Meshy_AI_Rosewing_Dragoness",
    clips: { idle: "Alert", run: "Running" },
    optional: { intro: "Intro", showcase: "Casual_Walk", cast: "Cast" },
    fallbacks: { idle: { character: "crimsonEnchantress", file: "Short_Breathe_and_Loo" } },
  },
  crimsonWitch: {
    folder: "bruxa-carmesim",
    prefix: "Meshy_AI_Crimson_Witch",
    // Her breathing idle also presents her on the menus, so she needs no separate showcase.
    clips: { idle: "Short_Breathe_and_Loo", run: "Running" },
    optional: { intro: "Intro", cast: "Cast" },
  },
};
