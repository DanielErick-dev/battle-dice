#!/usr/bin/env node
// Shrinks static Meshy models (props) for the web. Usage: docs/assets.md.
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const OUTPUT_DIR = path.resolve(fileURLToPath(import.meta.url), "../../../public/models/props");
const TEXTURE_SIZE = 512;

// Prop id → source file, vertex budget and texture size (default TEXTURE_SIZE).
const PROPS = {
  skull: { file: "boneShaman/props/skull.glb", vertices: 6_000 },
  skeletalHand: { file: "boneShaman/props/hand.glb", vertices: 4_000 },
  skeleton: { file: "boneShaman/props/skeleton.glb", vertices: 8_000 },
  // Many at once in an Arrow Rain: kept light.
  elvenArrow: { file: "elvenArcher/props/arrow.glb", vertices: 3_000 },
  frostWand: { file: "crystalFairy/props/wand.glb", vertices: 6_000 },
  // Her wings, flapped in code on her back (Meshy can't rig a winged figure): see FairyWings.
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
  tideThrone: { file: "tideMaiden/props/chair.glb", vertices: 9_000 },
  stormThrone: { file: "wanderingSage/props/chair.glb", vertices: 9_000 },
  crimsonThrone: { file: "crimsonWitch/props/chair.glb", vertices: 9_000 },
  jesterThrone: { file: "cardJester/props/chair.glb", vertices: 9_000 },
  enchantressThrone: { file: "crimsonEnchantress/props/chair.glb", vertices: 9_000 },
  alchemistThrone: { file: "emeraldAlchemist/props/chair.glb", vertices: 9_000 },
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

for (const [id, { file, vertices, texture = TEXTURE_SIZE }] of Object.entries(PROPS)) {
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
    simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, vertices / count), error: 0.01 }),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [texture, texture] }),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const output = path.join(OUTPUT_DIR, `${id}.glb`);
  await io.write(output, document);
  const { size } = await stat(output);
  console.log(`${id}: ${(size / 1024).toFixed(0)} KB → ${path.relative(process.cwd(), output)}`);
}
