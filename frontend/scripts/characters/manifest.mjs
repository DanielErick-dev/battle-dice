/**
 * Where each character's Meshy exports live: `folder` is its subfolder of the source folder
 * (see build-characters.mjs), holding one export per clip, named after the clip the game plays
 * (CharacterClip in src/features/match/characters.ts). `idle.glb` and `run.glb` are required;
 * the rest are used when there: `intro.glb` plays once on the menus as the character is
 * picked, then `showcase.glb` loops to present them (they idle without one), `cast.glb` plays
 * once as they use their ability (without it, the figure leaps), `float.glb` loops while they
 * levitate (they idle without one), `dash.glb` plays once as they throw themselves into a lightning
 * dash and `land.glb` as they touch down out of it, `shove.glb` as the Berserker shoves someone he
 * trampled, `knocked.glb` as they're sent flying, `rest.glb` loops, seated, while they've lost turns, and
 * `hop.glb` plays once as the Crystal Fairy stops on her own snow.
 * `fallbacks` borrow a required clip from another character (by id) until the own export exists.
 * `sequences` make a clip of several exports in the folder played back to back (named without
 * `.glb`; `@1.5` starts it 1.5 s in, `@0-3` plays only its first 3 s, `*1.4` plays it 1.4 times as
 * fast, a `:reverse` suffix plays it backwards and `:grounded` keeps the body on the floor), in place
 * of the clip's own export.
 * The ids match CHARACTERS in src/features/match/characters.ts.
 */
export const REQUIRED_CLIPS = ["idle", "run"];
export const OPTIONAL_CLIPS = ["intro", "showcase", "cast", "float", "dash", "land", "shove", "knocked", "rest", "hop"];
/**
 * Optional clips every character without its own export borrows from one (by id), bone rotations
 * and the hips' height (see build-characters.mjs): anyone can be knocked flying, and one fall onto
 * their back fits every body; so does one way of sitting on a chair, legs crossed, while turns are lost.
 */
export const SHARED_CLIPS = { knocked: "voidKnight", rest: "goldenGuardian" };

export const CHARACTER_MODELS = {
  // Knocked down (shared by everyone): he falls onto his back, lies a moment, then gets up, a
  // little quicker than the export. Both are Meshy library moves, kept on the floor (`grounded`).
  voidKnight: {
    folder: "cavaleiro-do-vazio",
    sequences: { knocked: ["knocked@0-1.3:grounded", "levantar@1.5-6.4*1.4:grounded"] },
  },
  crimsonEnchantress: { folder: "encantadora-carmesim" },
  // She levitates on the menus too, so her float doubles as her showcase.
  crimsonWitch: { folder: "bruxa-carmesim" },
  emeraldAlchemist: { folder: "alquimista-esmeralda" },
  // His intro: a capoeira ginga straight into a spinning jump. Into a lightning dash he crouches
  // and pushes off (past the steps that open the clip); out of it he drops from the top of a jump
  // (0.85 s into it) and lands.
  wanderingSage: {
    folder: "velho-andarilho",
    sequences: { intro: ["ginga", "giro"], dash: ["impulso@0.4"], land: ["aterrissagem@0.85"] },
  },
  elvenArcher: { folder: "arqueira-elfica" },
  cardJester: { folder: "coringa-carmesim" },
  boneShaman: { folder: "necromante" },
  // His intro: he writes in the air with his right hand (cut once the arm is back down), then
  // throws both arms up.
  fleshScribe: { folder: "escriba-da-carne", sequences: { intro: ["escrever@0-3.85", "bracos"] } },
  shadowWarden: { folder: "guardiao-das-sombras" },
  purgatoryKunoichi: { folder: "kunoichi-do-purgatorio" },
  crystalFairy: { folder: "fada-cristalina" },
  windGuardian: { folder: "zefiro-guardiao-dos-ventos" },
  tideMaiden: { folder: "nerissa-donzela-das-mares" },
  crimsonStudent: { folder: "akane-estudante-rubra" },
  // His shove: only the first thrust of both hands (the export then walks on into a second push).
  frostfangBerserker: { folder: "bjorn-presa-gelida", sequences: { shove: ["shove@0.05-0.55"] } },
  goldenGuardian: { folder: "auric-guardiao-dourado" },
  seraphGuardian: { folder: "seraphiel-serafim-guardiao" },
  // Seraphiel after the Fall (CharacterDefinition.fallenModel), not a character of his own.
  fallenSeraph: { folder: "seraphiel-caido" },
  clockworkSentinel: { folder: "cronos-sentinela-de-engrenagens" },
  sentinelMech: { folder: "alva-mecha-sentinela" },
};
