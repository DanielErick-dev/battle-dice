#!/usr/bin/env node
/**
 * Builds the web-ready props (static models: skulls, hands, arrows…) from Meshy AI exports.
 *
 * A Meshy "Text to 3D" export carries hundreds of thousands of vertices and 4K textures, while a
 * prop fills a sliver of the screen and may appear a dozen times at once. This keeps a few
 * thousand vertices and one small WebP colour texture, and compresses the rest with meshopt.
 * Output: public/models/props/<id>.glb (tens of KB each).
 *
 *   node scripts/props/build-props.mjs --source /path/to/battle-dice-personagens
 *
 * Each prop lives in its character's source folder, under `props/` (see PROPS below).
 */
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

/** Prop id → its export (relative to the source folder) and how many vertices it keeps. */
const PROPS = {
  skull: { file: "necromante/props/skull.glb", vertices: 6_000 },
  skeletalHand: { file: "necromante/props/hand.glb", vertices: 4_000 },
  skeleton: { file: "necromante/props/skeleton.glb", vertices: 8_000 },
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

for (const [id, { file, vertices }] of Object.entries(PROPS)) {
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
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [TEXTURE_SIZE, TEXTURE_SIZE] }),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const output = path.join(OUTPUT_DIR, `${id}.glb`);
  await io.write(output, document);
  const { size } = await stat(output);
  console.log(`${id}: ${(size / 1024).toFixed(0)} KB → ${path.relative(process.cwd(), output)}`);
}
