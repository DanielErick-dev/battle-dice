/**
 * Where each character's Meshy exports live: `folder` is its subfolder of the source folder
 * (see build-characters.mjs), holding one export per clip, named after the clip the game plays
 * (CharacterClip in src/features/match/characters.ts). `idle.glb` and `run.glb` are required;
 * the rest are used when there: `intro.glb` plays once on the menus as the character is
 * picked, then `showcase.glb` loops to present them (they idle without one), `cast.glb` plays
 * once as they use their ability (without it, the figure leaps), `float.glb` loops while they
 * levitate (they idle without one), `dash.glb` plays once as they throw themselves into a lightning
 * dash and `land.glb` as they touch down out of it.
 * `fallbacks` borrow a required clip from another character (by id) until the own export exists.
 * `sequences` make a clip of several exports in the folder played back to back (named without
 * `.glb`; `@1.5` starts it 1.5 s in, `@0-3` plays only its first 3 s, a `:reverse` suffix plays it
 * backwards), in place of the clip's own export.
 * The ids match CHARACTERS in src/features/match/characters.ts.
 */
export const REQUIRED_CLIPS = ["idle", "run"];
export const OPTIONAL_CLIPS = ["intro", "showcase", "cast", "float", "dash", "land"];

export const CHARACTER_MODELS = {
  voidKnight: { folder: "cavaleiro-do-vazio" },
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
  frostfangBerserker: { folder: "bjorn-presa-gelida" },
  goldenGuardian: { folder: "auric-guardiao-dourado" },
  seraphGuardian: { folder: "seraphiel-serafim-guardiao" },
  clockworkSentinel: { folder: "cronos-sentinela-de-engrenagens" },
  sentinelMech: { folder: "alva-mecha-sentinela" },
};
