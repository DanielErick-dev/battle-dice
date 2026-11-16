#!/usr/bin/env node
// Shrinks static Meshy models (props) for the web. Usage: docs/assets.md.
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { compactPrimitive, dedup, meshopt, prune, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const OUTPUT_DIR = path.resolve(fileURLToPath(import.meta.url), "../../../public/models/props");
const TEXTURE_SIZE = 512;

// Prop id → source file, vertex budget, texture size (default TEXTURE_SIZE) and `sloppy` (see sloppySimplify).
const PROPS = {
  skull: { file: "necromancer/props/skull.glb", vertices: 6_000 },
  skeletalHand: { file: "necromancer/props/hand.glb", vertices: 4_000 },
  skeleton: { file: "necromancer/props/skeleton.glb", vertices: 8_000 },
  // Many at once in an Arrow Rain: kept light.
  elvenArrow: { file: "archer/props/arrow.glb", vertices: 3_000 },
  elvenBow: { file: "archer/props/bow.glb", vertices: 6_000 },
  archerTarget: { file: "archer/props/target.glb", vertices: 8_000 },
  frostWand: { file: "fairy/props/wand.glb", vertices: 6_000 },
  // Zarek's Void roaming the board: a wraith of black smoke (moved in code, not rigged).
  voidWraith: { file: "zarek/props/wraith.glb", vertices: 10_000, texture: 1024 },
  // Themis's scales of justice, hanging from her hand.
  justiceScale: { file: "themis/props/scale.glb", vertices: 8_000, texture: 1024 },
  // Her sword, held point down at her right side.
  justiceSword: { file: "themis/props/sword.glb", vertices: 6_000, texture: 1024 },
  // Ivy-crowned Greek column, one either side of her in her intro.
  greekColumn: { file: "themis/props/column.glb", vertices: 30_000, texture: 1024, sloppy: true },
  // The Silent Verdict's giant scale, in parts so code can tilt the beam and swing the pans.
  scaleBeam: { file: "themis/props/scale-beam.glb", vertices: 8_000, texture: 1024, sloppy: true },
  scalePan: { file: "themis/props/scale-pan.glb", vertices: 8_000, texture: 1024, sloppy: true },
  // Her menu habitat, the tribunal: a stone arena floor, an ivy archway behind her and an offering basin.
  tribunalArena: { file: "themis/props/arena.glb", vertices: 12_000, texture: 2048, sloppy: true },
  tribunalArch: { file: "themis/props/archway.glb", vertices: 14_000, texture: 1024, sloppy: true },
  offeringBasin: { file: "themis/props/basin.glb", vertices: 8_000, texture: 1024, sloppy: true },
  // Akane's menu habitat: a stone courtyard floor ringed with lanterns, and a stone garden lantern.
  akaneCourtyard: { file: "akane/props/courtyard.glb", vertices: 14_000, texture: 2048, sloppy: true },
  akaneLantern: { file: "akane/props/lantern.glb", vertices: 8_000, texture: 1024, sloppy: true },
  // 6.5M vertices of loose blossoms from Meshy (its remesh lost the pink): squeezed hard, the leaves kept apart.
  akaneTree: { file: "akane/props/tree.glb", vertices: 40_000, texture: 2048, sloppy: true },
  viniciusHoe: { file: "vinicius/props/hoe.glb", vertices: 4_000, texture: 1024 },
  // Only 43k vertices after Meshy's remesh: kept whole, as squeezing it smears the texture across its UV seams.
  viniciusGarden: { file: "vinicius/props/garden.glb", vertices: 43_000, texture: 2048 },
  // Her wings, flapped in code (Meshy can't rig a winged figure): see Wings.
  fairyWings: { file: "fairy/props/wings.glb", vertices: 8_000, texture: 1024 },
  seraphWings: { file: "seraphiel/props/wings.glb", vertices: 8_000, texture: 1024 },
  fallenWings: { file: "seraphielFallen/props/wings.glb", vertices: 8_000, texture: 1024 },
  blackFlame: { file: "kage/props/flame.glb", vertices: 9_000 },
  // Chairs the characters sit on while they've lost turns (see RestChair).
  frostThrone: { file: "fairy/props/chair.glb", vertices: 9_000 },
  infernalThrone: { file: "akane/props/chair.glb", vertices: 9_000 },
  wolfThrone: { file: "bjorn/props/chair.glb", vertices: 9_000 },
  celestialThrone: { file: "seraphiel/props/chair.glb", vertices: 9_000 },
  ashenThrone: { file: "seraphielFallen/props/chair.glb", vertices: 9_000 },
  clockworkThrone: { file: "cronos/props/chair.glb", vertices: 9_000 },
  cyberThrone: { file: "alva/props/chair.glb", vertices: 9_000 },
  // Unidade Alva's menu habitat, the hangar: machines round the back, a drone hovering over it.
  // Flattened in code to a thin disc under her: the bay's floor.
  hangarPad: { file: "alva/props/landing-pad.glb", vertices: 20_000, texture: 2048, sloppy: true },
  // A braided power cable, flange at one end (-Z, on the floor) and a clamp raised at the other (+Z).
  hangarCable: { file: "alva/props/power-cable.glb", vertices: 12_000, texture: 1024, sloppy: true },
  hangarReactor: { file: "alva/props/alien-reactor.glb", vertices: 12_000, texture: 1024, sloppy: true },
  hangarGenerator: { file: "alva/props/power-generator.glb", vertices: 14_000, texture: 1024, sloppy: true },
  hangarCapsule: { file: "alva/props/crystal-capsule.glb", vertices: 5_500, texture: 1024 },
  hangarRack: { file: "alva/props/server-rack.glb", vertices: 5_300, texture: 1024 },
  hangarCore: { file: "alva/props/hypergate-core.glb", vertices: 4_000, texture: 1024 },
  hangarDrone: { file: "alva/props/sentinel-drone.glb", vertices: 12_000, texture: 1024, sloppy: true },
  obsidianThrone: { file: "kage/props/chair.glb", vertices: 9_000 },
  elderwoodThrone: { file: "archer/props/chair.glb", vertices: 9_000 },
  tideThrone: { file: "auric/props/chair.glb", vertices: 9_000 },
  stormThrone: { file: "monk/props/chair.glb", vertices: 9_000 },
  crimsonThrone: { file: "witch/props/chair.glb", vertices: 9_000 },
  jesterThrone: { file: "jester/props/chair.glb", vertices: 9_000 },
  scribeThrone: { file: "scribe/props/chair.glb", vertices: 9_000 },
  alchemistThrone: { file: "alchemist/props/chair.glb", vertices: 9_000 },
  necromancerThrone: { file: "necromancer/props/chair.glb", vertices: 9_000 },
  elementalThrone: { file: "zephyr/props/chair.glb", vertices: 9_000 },
  amethystThrone: { file: "zarek/props/chair.glb", vertices: 9_000 },
  moonThrone: { file: "themis/props/chair.glb", vertices: 9_000 },
  shadowThrone: { file: "warden/props/chair.glb", vertices: 9_000 },
  roseThrone: { file: "enchantress/props/chair.glb", vertices: 9_000 },
  // Crowns worn on the head (see HeadCrown). The fallen one stays ~0.9 MB: its thorns' UV seams stop the simplifier.
  seraphCrown: { file: "seraphiel/props/crown.glb", vertices: 6_000 },
  fallenCrown: { file: "seraphielFallen/props/crown.glb", vertices: 6_000 },
  // Habitat pieces on the menu stages (see features/menu/stage/scenery): stand behind the figure, so kept light.
  kageTorii: { file: "kage/props/torii.glb", vertices: 9_000, texture: 1024 },
  witchCauldron: { file: "witch/props/cauldron.glb", vertices: 8_000 },
  kageTree: { file: "kage/props/tree.glb", vertices: 20_000, texture: 1024, sloppy: true },
  auricPillars: { file: "auric/props/pillars.glb", vertices: 10_000, texture: 1024, sloppy: true },
  auricChest: { file: "auric/props/chest.glb", vertices: 8_000, sloppy: true },
  auricCoral: { file: "auric/props/coral.glb", vertices: 10_000, sloppy: true },
  cronosGlobe: { file: "cronos/props/globe.glb", vertices: 8_000 },
  // The island's woods: many copies on the board, so light.
  islandPine: { file: "island/props/pine.glb", vertices: 9_000, texture: 1024 },
  islandRockyTree: { file: "island/props/rockyTree.glb", vertices: 12_000, sloppy: true },
  bjornCrystal: { file: "bjorn/props/crystal.glb", vertices: 6_000 },
  roseCandelabra: { file: "enchantress/props/candelabra.glb", vertices: 9_000, sloppy: true },
  // Kage Rubra's Susanoo towers over the tile: more detail than the small props.
  susanoo: { file: "kage/props/susanoo.glb", vertices: 16_000, texture: 1024 },
  // The island's path furniture: lamp posts along the trail, benches and a wooden bridge.
  lanternPost: { file: "island/props/lantern-post.glb", vertices: 2_200, texture: 512 },
  islandBench: { file: "island/props/bench.glb", vertices: 6_000, texture: 1024, sloppy: true },
  woodenBridge: { file: "island/props/bridge.glb", vertices: 12_000, texture: 1024, sloppy: true },
  // Floats over every lost-turn tile.
  hourglass: { file: "board/props/hourglass.glb", vertices: 5_000, texture: 1024 },
  // The Crystal Fairy's snow heaped on a tile.
  snowPile: { file: "fairy/props/snow.glb", vertices: 5_000, texture: 1024 },
  // The Shadow Warden's three apparitions, one model (moved in code).
  wardenSpecters: { file: "warden/props/specters.glb", vertices: 18_000, texture: 1024, sloppy: true },
  // More island furniture: a stone windmill, a bamboo boat by the shore, a hanging sign and campfires by the tents.
  islandWindmill: { file: "island/props/windmill.glb", vertices: 4_100, texture: 1024 },
  bambooBoat: { file: "island/props/boat.glb", vertices: 4_000, texture: 1024 },
  hangingSign: { file: "island/props/sign.glb", vertices: 6_000, texture: 1024, sloppy: true },
  campfire: { file: "island/props/campfire.glb", vertices: 9_000, texture: 1024, sloppy: true },
  // Card tiles: the lid is split off in code so it can open (see CardChest).
  cardChest: { file: "board/props/chest.glb", vertices: 9_000, texture: 1024, sloppy: true },
  // Tenzai's fire and earth: his orbit charms, the flame in his hand and the stones of his wall.
  tenzaiFlame: { file: "zephyr/props/flame.glb", vertices: 3_000, texture: 512 },
  tenzaiBoulder: { file: "zephyr/props/boulder.glb", vertices: 2_500, texture: 512 },
  // The Alchemist's potions and grimoire (her charms) and the counter beside her habitat.
  elixirEmerald: { file: "alchemist/props/elixir-emerald.glb", vertices: 4_000, texture: 512, sloppy: true },
  elixirEssence: { file: "alchemist/props/elixir-essence.glb", vertices: 5_000, texture: 512, sloppy: true },
  arcaneGrimoire: { file: "alchemist/props/grimoire.glb", vertices: 3_000, texture: 512 },
  alchemyCounter: { file: "alchemist/props/counter.glb", vertices: 9_000, texture: 1024, sloppy: true },
  witchStaff: { file: "witch/props/staff.glb", vertices: 5_000, texture: 1024 },
  gravestone: { file: "necromancer/props/gravestone.glb", vertices: 6_000, texture: 1024, sloppy: true },
};

const { values } = parseArgs({ options: { source: { type: "string" }, only: { type: "string" } } });
if (!values.source) {
  console.error("Usage: build-props.mjs --source <folder with one subfolder per character> [--only <id>]");
  process.exit(1);
}

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
await mkdir(OUTPUT_DIR, { recursive: true });

for (const [id, { file, vertices, texture = TEXTURE_SIZE, sloppy = false }] of Object.entries(PROPS)) {
  if (values.only && values.only !== id) continue;
  const document = await io.read(path.join(values.source, file));
  const root = document.getRoot();
  // Only the colour is worth its bytes at this size; normal and roughness maps go.
  for (const material of root.listMaterials()) {
    material.setNormalTexture(null).setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(0.8);
  }
  const count = root.listMeshes()[0].listPrimitives()[0].getAttribute("POSITION").getCount();
  await document.transform(
    dedup(),
    weld(),
    sloppy
      ? sloppySimplify(Math.min(1, vertices / count))
      : simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, vertices / count), error: 0.01 }),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [texture, texture] }),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  // Same layout as the source: one folder per character (props/<codeId>/<name>.glb).
  const output = path.join(OUTPUT_DIR, file.replace("/props/", "/"));
  await mkdir(path.dirname(output), { recursive: true });
  await io.write(output, document);
  const { size } = await stat(output);
  console.log(`${id}: ${(size / 1024).toFixed(0)} KB → ${path.relative(process.cwd(), output)}`);
}

/**
 * Simplifies ignoring UV seams and topology: foliage is thousands of loose leaves, each its own UV island,
 * which the regular simplifier won't merge (a tree stayed at 1.1M vertices).
 */
function sloppySimplify(ratio) {
  return (document) => {
    for (const mesh of document.getRoot().listMeshes()) {
      for (const primitive of mesh.listPrimitives()) {
        const indices = primitive.getIndices();
        const positions = new Float32Array(primitive.getAttribute("POSITION").getArray());
        const target = Math.floor((indices.getCount() * ratio) / 3) * 3;
        const [kept] = MeshoptSimplifier.simplifySloppy(
          new Uint32Array(indices.getArray()),
          positions,
          3,
          null,
          target,
          0.05,
        );
        indices.setArray(kept);
        compactPrimitive(primitive);
      }
    }
  };
}
