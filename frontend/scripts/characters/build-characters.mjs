#!/usr/bin/env node
/**
 * Builds the web-ready character models from Meshy AI exports.
 *
 * Meshy exports one GLB per animation, each repeating the whole mesh and 4K textures
 * (13–18 MB apiece). This keeps the mesh and textures once, gathers the clips we play into
 * one file under stable names, and shrinks it: simplified mesh, 1024px WebP textures and
 * meshopt compression. Output: public/models/characters/<id>.glb (a few MB each).
 *
 *   node scripts/characters/build-characters.mjs --source /path/to/battle-dice-personagens
 *
 * The source folder holds one subfolder per character (its `folder` in the manifest) with
 * that character's Meshy exports and reference images; they aren't kept in the repo.
 */
import { access, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, resample, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { CHARACTER_MODELS } from "./manifest.mjs";

const OUTPUT_DIR = path.resolve(fileURLToPath(import.meta.url), "../../../public/models/characters");
/** Plenty for a figure that fills a fraction of the screen; the heaviest export has ~100k. */
const TARGET_VERTICES = 24_000;
const TEXTURE_SIZE = 1024;
/** Clips played standing on one spot (menu stage, ability), so the figure never wanders off it. */
const IN_PLACE_CLIPS = ["intro", "showcase", "cast"];

const { values } = parseArgs({
  options: { source: { type: "string" }, only: { type: "string" } },
});
if (!values.source) {
  console.error("Usage: build-characters.mjs --source <folder with one subfolder per character> [--only <id>]");
  process.exit(1);
}

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
await mkdir(OUTPUT_DIR, { recursive: true });

for (const [id, model] of Object.entries(CHARACTER_MODELS)) {
  if (values.only && values.only !== id) continue;
  const output = path.join(OUTPUT_DIR, `${id}.glb`);
  await buildCharacter(model, output);
  const { size } = await stat(output);
  console.log(`${id}: ${(size / 1024 / 1024).toFixed(2)} MB → ${path.relative(process.cwd(), output)}`);
}

/**
 * Mesh and textures from the first of the character's own exports found, every clip's
 * animation, then optimised. A required clip without its own export is borrowed from another
 * character (`fallbacks`), bone rotations only, so it moves the same without taking on the
 * other body's proportions. `optional` clips are added only when exported.
 */
async function buildCharacter({ folder, prefix, clips, optional = {}, fallbacks = {} }, output) {
  const exportOf = (character, file) => path.join(values.source, character.folder, `${character.prefix}_${file}.glb`);
  const ownExport = (file) => exportOf({ folder, prefix }, file);
  const sources = [];
  for (const [name, file] of Object.entries(clips)) {
    if (await exists(ownExport(file))) sources.push({ name, path: ownExport(file), rotationsOnly: false });
    else if (fallbacks[name]) {
      const borrowed = exportOf(CHARACTER_MODELS[fallbacks[name].character], fallbacks[name].file);
      console.warn(`  (no ${path.basename(ownExport(file))}: "${name}" borrowed from ${path.basename(borrowed)})`);
      sources.push({ name, path: borrowed, rotationsOnly: true });
    } else throw new Error(`Missing ${ownExport(file)}`);
  }
  for (const [name, file] of Object.entries(optional)) {
    if (await exists(ownExport(file))) sources.push({ name, path: ownExport(file), rotationsOnly: false });
    else console.warn(`  (no ${path.basename(ownExport(file))}: "${name}" clip left out)`);
  }

  const base = sources.find((source) => !source.rotationsOnly);
  if (!base) throw new Error(`No export of ${prefix} itself to take the mesh from`);
  const document = await io.read(base.path);
  const root = document.getRoot();
  // Meshy adds a one-frame ".001" rest pose next to each clip; the clips are copied in below.
  root.listAnimations().forEach((animation) => animation.dispose());

  for (const source of sources) {
    const clip = await io.read(source.path);
    copyAnimation(clip.getRoot().listAnimations()[0], document, source.name, source);
  }

  const vertices = root.listMeshes()[0].listPrimitives()[0].getAttribute("POSITION").getCount();
  await document.transform(
    dedup(),
    resample(),
    weld(),
    simplify({
      simplifier: MeshoptSimplifier,
      ratio: Math.min(1, TARGET_VERTICES / vertices),
      error: 0.001,
    }),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [TEXTURE_SIZE, TEXTURE_SIZE],
    }),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  await io.write(output, document);
}

/**
 * Recreates `animation` in `target` under `name`. Every export shares the same skeleton
 * (Meshy's Mixamo rig), so channels find their bones by name. `rotationsOnly` leaves out the
 * translations, which carry the source body's bone lengths.
 */
function copyAnimation(animation, target, name, { rotationsOnly }) {
  const root = target.getRoot();
  const buffer = root.listBuffers()[0];
  const bones = new Map(root.listNodes().map((node) => [node.getName(), node]));
  const copy = target.createAnimation(name);
  const copyAccessor = (accessor) =>
    target.createAccessor().setType(accessor.getType()).setArray(accessor.getArray().slice()).setBuffer(buffer);

  for (const channel of animation.listChannels()) {
    if (rotationsOnly && channel.getTargetPath() !== "rotation") continue;
    const bone = bones.get(channel.getTargetNode().getName());
    if (!bone)
      throw new Error(`Clip "${name}" animates "${channel.getTargetNode().getName()}", missing from the base model`);
    const sampler = channel.getSampler();
    const output = copyAccessor(sampler.getOutput());
    if (IN_PLACE_CLIPS.includes(name) && channel.getTargetPath() === "translation" && bone.getName().endsWith("Hips")) {
      pinHorizontally(output.getArray());
    }
    const samplerCopy = target
      .createAnimationSampler()
      .setInput(copyAccessor(sampler.getInput()))
      .setOutput(output)
      .setInterpolation(sampler.getInterpolation());
    copy.addSampler(samplerCopy);
    copy.addChannel(
      target
        .createAnimationChannel()
        .setTargetNode(bone)
        .setTargetPath(channel.getTargetPath())
        .setSampler(samplerCopy),
    );
  }
}

/**
 * Keeps the hips over their first-frame spot on the ground, leaving the height alone: Meshy moves
 * followed a traveling figure, so a lunge would end a step away and snap back into the idle.
 */
function pinHorizontally(positions) {
  const [x, , z] = positions;
  for (let index = 0; index < positions.length; index += 3) {
    positions[index] = x;
    positions[index + 2] = z;
  }
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}
