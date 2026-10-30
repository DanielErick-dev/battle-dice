#!/usr/bin/env node
// Packs the free (CC0) kit pieces the board uses into one GLB per kit (shared textures). Usage: docs/assets.md.
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  mergeDocuments,
  meshopt,
  prune,
  resample,
  textureCompress,
  unpartition,
  weld,
} from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

const OUTPUT_DIR = path.resolve(fileURLToPath(import.meta.url), "../../../public/models/island");

/**
 * Pack → its folder under `--source`, how a piece's file is found, and the pieces taken (folder → names).
 * Each piece becomes a top node named after its file.
 */
const PACKS = {
  // KayKit Medieval Hexagon (CC0): the settlements.
  kaykit: {
    folder: "kaykit",
    file: (folder, name) => path.join(folder, `${name}.gltf`),
    pieces: {
      "buildings/blue": [
        "building_home_A_blue",
        "building_home_B_blue",
        "building_tavern_blue",
        "building_market_blue",
        "building_blacksmith_blue",
        "building_well_blue",
        "building_windmill_blue",
        "building_church_blue",
        "building_watermill_blue",
        "building_lumbermill_blue",
        "building_tower_A_blue",
        "building_castle_blue",
        "building_archeryrange_blue",
      ],
      "buildings/red": ["building_home_A_red", "building_home_B_red", "building_tavern_red"],
      "buildings/neutral": [
        "building_grain",
        "building_stage_A",
        "fence_wood_straight",
        "wall_straight",
        "wall_straight_gate",
        "wall_corner_A_outside",
      ],
      "decoration/nature": [
        "tree_single_A",
        "tree_single_B",
        "trees_A_medium",
        "trees_B_medium",
        "trees_A_large",
        "rock_single_A",
        "rock_single_B",
        "rock_single_C",
        "waterlily_A",
      ],
      "decoration/props": [
        "barrel",
        "crate_A_big",
        "crate_B_small",
        "sack",
        "wheelbarrow",
        "tent",
        "flag_blue",
        "flag_red",
        "resource_lumber",
        "weaponrack",
        "bucket_water",
      ],
    },
  },
  // Kenney Pirate Kit and Nature Kit (CC0): the coast, the sea and the countryside.
  kenney: {
    folder: "kenney",
    file: (folder, name) => path.join(folder, `${name}.glb`),
    pieces: {
      "pirate/Models/GLB format": [
        "ship-large",
        "ship-medium",
        "ship-small",
        "boat-row-small",
        "structure-platform-dock",
        "rocks-sand-a",
        "rocks-sand-b",
        "rocks-sand-c",
        "palm-bend",
        "palm-straight",
      ],
      "nature/Models/GLTF format": [
        "rock_largeA",
        "rock_largeC",
        "rock_largeE",
        "rock_tallA",
        "rock_tallC",
        "flower_purpleA",
        "flower_redA",
        "flower_yellowA",
        "flower_purpleB",
        "flower_redB",
        "flower_yellowB",
        "plant_bush",
        "plant_bushLarge",
        "plant_bushDetailed",
        "mushroom_redGroup",
        "mushroom_tanGroup",
        "log",
        "stump_round",
        "crops_wheatStageB",
        "crops_cornStageD",
        "campfire_logs",
        "lily_large",
        "lily_small",
        "statue_obelisk",
        "statue_column",
        "bridge_woodRound",
      ],
    },
  },
};

const DUNGEON = "KayKit-Dungeon-Remastered-1.0/KayKit-Dungeon-Remastered-1.0-main/addons/kaykit_dungeon_remastered/Assets/gltf";
PACKS.dungeon = {
  // KayKit Dungeon Remastered (CC0): the dungeon map.
  folder: "kaykit-extra",
  file: (folder, name) => path.join(folder, `${name}.gltf.glb`),
  pieces: {
    [DUNGEON]: [
      "wall",
      "wall_arched",
      "wall_broken",
      "wall_cracked",
      "wall_pillar",
      "wall_window_closed",
      "pillar",
      "pillar_decorated",
      "column",
      "torch_mounted",
      "torch_lit",
      "barrel_large",
      "barrel_small_stack",
      "box_stacked",
      "crates_stacked",
      "keg_decorated",
      "coin_stack_large",
      "coin_stack_medium",
      "candle_triple",
      "candle_lit",
      "rubble_large",
      "rubble_half",
      "banner_patternA_red",
      "banner_shield_red",
      "table_long_decorated_A",
      "shelves",
      "sword_shield_broken",
      "trunk_large_A",
    ],
  },
};

PACKS.wasteland = {
  // Kenney Retro Urban, Car, Graveyard and Survival kits (CC0): the wasteland map.
  folder: "kenney",
  file: (folder, name) => path.join(folder, `${name}.glb`),
  pieces: {
    "retro-urban/Models/GLB format": [
      "wall-broken-type-a",
      "wall-broken-type-b",
      "wall-a-flat-window",
      "wall-b-flat-window",
      "wall-a-corner",
      "scaffolding-structure",
      "detail-dumpster-open",
      "detail-barrier-strong-damaged",
      "detail-barrier-type-a",
      "detail-light-single",
      "truck-grey",
      "truck-green-cargo",
      "pallet",
      "planks",
    ],
    "car/Models/GLB format": [
      "sedan",
      "suv",
      "taxi",
      "police",
      "van",
      "ambulance",
      "debris-tire",
      "debris-door",
      "debris-bumper",
      "cone",
    ],
    "graveyard/Models/GLB format": [
      "pine-crooked",
      "pine-fall-crooked",
      "gravestone-broken",
      "iron-fence-damaged",
      "fire-basket",
      "debris",
      "debris-wood",
      "rocks",
    ],
    "survival/Models/GLB format": [
      "barrel",
      "structure-metal",
      "metal-panel",
      "tent-canvas",
      "campfire-pit",
      "fence-fortified",
      "signpost",
      "tree-trunk",
    ],
  },
};

/** Animated figures for the maps (KayKit character packs, CC0): only the clips the maps play are kept. */
const NPC_SOURCES = {
  Knight: "KayKit-Character-Pack-Adventures-1.0/KayKit-Character-Pack-Adventures-1.0-main/addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb",
  Barbarian: "KayKit-Character-Pack-Adventures-1.0/KayKit-Character-Pack-Adventures-1.0-main/addons/kaykit_character_pack_adventures/Characters/gltf/Barbarian.glb",
  Mage: "KayKit-Character-Pack-Adventures-1.0/KayKit-Character-Pack-Adventures-1.0-main/addons/kaykit_character_pack_adventures/Characters/gltf/Mage.glb",
  Rogue: "KayKit-Character-Pack-Adventures-1.0/KayKit-Character-Pack-Adventures-1.0-main/addons/kaykit_character_pack_adventures/Characters/gltf/Rogue_Hooded.glb",
  SkeletonWarrior: "KayKit-Character-Pack-Skeletons-1.0/KayKit-Character-Pack-Skeletons-1.0-main/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Warrior.glb",
  SkeletonMinion: "KayKit-Character-Pack-Skeletons-1.0/KayKit-Character-Pack-Skeletons-1.0-main/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Minion.glb",
  SkeletonMage: "KayKit-Character-Pack-Skeletons-1.0/KayKit-Character-Pack-Skeletons-1.0-main/addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Mage.glb",
};
const NPC_CLIPS = new Set(["Idle", "Walking_A", "Cheer", "Interact", "Sit_Floor_Idle", "Idle_B", "Skeletons_Awaken_Floor"]);

const { values } = parseArgs({ options: { source: { type: "string" }, only: { type: "string" } } });
if (!values.source) {
  console.error("Usage: build-kits.mjs --source <battle-dice-personagens/island> [--only kaykit|kenney|dungeon|wasteland|npcs]");
  process.exit(1);
}

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
await mkdir(OUTPUT_DIR, { recursive: true });

for (const [id, pack] of Object.entries(PACKS)) {
  if (values.only && values.only !== id) continue;
  const target = new Document();
  const scene = target.createScene("Scene");
  target.getRoot().setDefaultScene(scene);
  for (const [folder, names] of Object.entries(pack.pieces)) {
    for (const name of names) {
      const source = await io.read(path.join(values.source, pack.folder, pack.file(folder, name)));
      const map = mergeDocuments(target, source);
      // One node per piece, named after its file, holding whatever the file's scene held.
      const piece = target.createNode(name);
      for (const node of source.getRoot().listScenes()[0].listChildren()) piece.addChild(map.get(node));
      scene.addChild(piece);
    }
  }
  for (const extra of target.getRoot().listScenes()) if (extra !== scene) extra.dispose();
  await target.transform(
    dedup(),
    weld(),
    unpartition(),
    textureCompress({ encoder: sharp, targetFormat: "webp" }),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const output = path.join(OUTPUT_DIR, `${id}.glb`);
  await io.write(output, target);
  const { size } = await stat(output);
  console.log(
    `${id}: ${scene.listChildren().length} pieces, ${(size / 1024).toFixed(0)} KB → ${path.relative(process.cwd(), output)}`,
  );
}

for (const [id, file] of Object.entries(NPC_SOURCES)) {
  if (values.only && values.only !== "npcs") continue;
  const document = await io.read(path.join(values.source, "kaykit-extra", file));
  for (const animation of document.getRoot().listAnimations()) {
    if (NPC_CLIPS.has(animation.getName())) continue;
    // Its samplers outlive it otherwise, holding on to every keyframe.
    animation.listChannels().forEach((channel) => channel.dispose());
    animation.listSamplers().forEach((sampler) => sampler.dispose());
    animation.dispose();
  }
  await document.transform(
    dedup(),
    resample(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [512, 512] }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const output = path.join(OUTPUT_DIR, "npcs", `${id}.glb`);
  await mkdir(path.dirname(output), { recursive: true });
  await io.write(output, document);
  const { size } = await stat(output);
  console.log(`npc ${id}: ${(size / 1024).toFixed(0)} KB`);
}
