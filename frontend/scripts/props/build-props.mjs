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
  skull: { file: "boneShaman/props/skull.glb", vertices: 6_000 },
  skeletalHand: { file: "boneShaman/props/hand.glb", vertices: 4_000 },
  skeleton: { file: "boneShaman/props/skeleton.glb", vertices: 8_000 },
  // Many at once in an Arrow Rain: kept light.
  elvenArrow: { file: "elvenArcher/props/arrow.glb", vertices: 3_000 },
  elvenBow: { file: "elvenArcher/props/bow.glb", vertices: 6_000 },
  archerTarget: { file: "elvenArcher/props/target.glb", vertices: 8_000 },
  frostWand: { file: "crystalFairy/props/wand.glb", vertices: 6_000 },
  // Zarek's Void roaming the board: a wraith of black smoke (moved in code, not rigged).
  voidWraith: { file: "voidKnight/props/wraith.glb", vertices: 10_000, texture: 1024 },
  // Themis's scales of justice, hanging from her hand.
  justiceScale: { file: "tideMaiden/props/scale.glb", vertices: 8_000, texture: 1024 },
  // Her wings, flapped in code (Meshy can't rig a winged figure): see Wings.
  fairyWings: { file: "crystalFairy/props/wings.glb", vertices: 8_000, texture: 1024 },
  seraphWings: { file: "seraphGuardian/props/wings.glb", vertices: 8_000, texture: 1024 },
  fallenWings: { file: "fallenSeraph/props/wings.glb", vertices: 8_000, texture: 1024 },
  blackFlame: { file: "purgatoryKunoichi/props/flame.glb", vertices: 9_000 },
  // Chairs the characters sit on while they've lost turns (see RestChair).
  frostThrone: { file: "crystalFairy/props/chair.glb", vertices: 9_000 },
  infernalThrone: { file: "crimsonStudent/props/chair.glb", vertices: 9_000 },
  wolfThrone: { file: "frostfangBerserker/props/chair.glb", vertices: 9_000 },
  celestialThrone: { file: "seraphGuardian/props/chair.glb", vertices: 9_000 },
  ashenThrone: { file: "fallenSeraph/props/chair.glb", vertices: 9_000 },
  clockworkThrone: { file: "clockworkSentinel/props/chair.glb", vertices: 9_000 },
  cyberThrone: { file: "sentinelMech/props/chair.glb", vertices: 9_000 },
  obsidianThrone: { file: "purgatoryKunoichi/props/chair.glb", vertices: 9_000 },
  elderwoodThrone: { file: "elvenArcher/props/chair.glb", vertices: 9_000 },
  tideThrone: { file: "goldenGuardian/props/chair.glb", vertices: 9_000 },
  stormThrone: { file: "wanderingSage/props/chair.glb", vertices: 9_000 },
  crimsonThrone: { file: "crimsonWitch/props/chair.glb", vertices: 9_000 },
  jesterThrone: { file: "cardJester/props/chair.glb", vertices: 9_000 },
  scribeThrone: { file: "fleshScribe/props/chair.glb", vertices: 9_000 },
  alchemistThrone: { file: "emeraldAlchemist/props/chair.glb", vertices: 9_000 },
  necromancerThrone: { file: "boneShaman/props/chair.glb", vertices: 9_000 },
  elementalThrone: { file: "windGuardian/props/chair.glb", vertices: 9_000 },
  amethystThrone: { file: "voidKnight/props/chair.glb", vertices: 9_000 },
  moonThrone: { file: "tideMaiden/props/chair.glb", vertices: 9_000 },
  shadowThrone: { file: "shadowWarden/props/chair.glb", vertices: 9_000 },
  roseThrone: { file: "crimsonEnchantress/props/chair.glb", vertices: 9_000 },
  // Crowns worn on the head (see HeadCrown). The fallen one stays ~0.9 MB: its thorns' UV seams stop the simplifier.
  seraphCrown: { file: "seraphGuardian/props/crown.glb", vertices: 6_000 },
  fallenCrown: { file: "fallenSeraph/props/crown.glb", vertices: 6_000 },
  // Habitat pieces on the menu stages (see features/menu/stage/scenery): stand behind the figure, so kept light.
  kageTorii: { file: "purgatoryKunoichi/props/torii.glb", vertices: 9_000, texture: 1024 },
  witchCauldron: { file: "crimsonWitch/props/cauldron.glb", vertices: 8_000 },
  kageTree: { file: "purgatoryKunoichi/props/tree.glb", vertices: 20_000, texture: 1024, sloppy: true },
  auricPillars: { file: "goldenGuardian/props/pillars.glb", vertices: 10_000, texture: 1024, sloppy: true },
  auricChest: { file: "goldenGuardian/props/chest.glb", vertices: 8_000, sloppy: true },
  auricCoral: { file: "goldenGuardian/props/coral.glb", vertices: 10_000, sloppy: true },
  cronosGlobe: { file: "clockworkSentinel/props/globe.glb", vertices: 8_000 },
  // The island's woods: many copies on the board, so light.
  islandPine: { file: "island/props/pine.glb", vertices: 9_000, texture: 1024 },
  islandRockyTree: { file: "island/props/rockyTree.glb", vertices: 12_000, sloppy: true },
  bjornCrystal: { file: "frostfangBerserker/props/crystal.glb", vertices: 6_000 },
  roseCandelabra: { file: "crimsonEnchantress/props/candelabra.glb", vertices: 9_000, sloppy: true },
  // Kage Rubra's Susanoo towers over the tile: more detail than the small props.
  susanoo: { file: "purgatoryKunoichi/props/susanoo.glb", vertices: 16_000, texture: 1024 },
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
  const output = path.join(OUTPUT_DIR, `${id}.glb`);
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
