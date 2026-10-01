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
import { CHARACTER_MODELS, OPTIONAL_CLIPS, REQUIRED_CLIPS } from "./manifest.mjs";

const OUTPUT_DIR = path.resolve(fileURLToPath(import.meta.url), "../../../public/models/characters");
/** Plenty for a figure that fills a fraction of the screen; the heaviest export has ~100k. */
const TARGET_VERTICES = 24_000;
const TEXTURE_SIZE = 1024;
/** Clips played standing on one spot (menu stage, ability), so the figure never wanders off it. */
const IN_PLACE_CLIPS = ["intro", "showcase", "cast", "float", "land", "dash"];
/**
 * Share of the travel an in-place clip keeps (none by default): a lunge into a dash keeps a little,
 * so the figure throws itself forward yet stays on its tile for the strike.
 */
const KEPT_TRAVEL = { dash: 0.4 };
/** Seconds between two parts of a sequence, for the pose to blend from one into the next. */
const SEQUENCE_BLEND_SECONDS = 0.3;

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
 * other body's proportions. Optional clips are added only when exported.
 */
async function buildCharacter({ folder, fallbacks = {}, sequences = {} }, output) {
  const exportOf = (character, clip) => path.join(values.source, character.folder, `${clip}.glb`);
  const ownExport = (clip) => exportOf({ folder }, clip);
  const sources = [];
  const sequenced = new Set(Object.keys(sequences));
  for (const name of REQUIRED_CLIPS) {
    if (await exists(ownExport(name))) sources.push({ name, path: ownExport(name), rotationsOnly: false });
    else if (fallbacks[name]) {
      const lender = CHARACTER_MODELS[fallbacks[name]];
      console.warn(`  (no ${folder}/${name}.glb: borrowed from ${lender.folder})`);
      sources.push({ name, path: exportOf(lender, name), rotationsOnly: true });
    } else throw new Error(`Missing ${ownExport(name)}`);
  }
  for (const name of OPTIONAL_CLIPS) {
    if (sequenced.has(name)) continue;
    if (await exists(ownExport(name))) sources.push({ name, path: ownExport(name), rotationsOnly: false });
    else console.warn(`  (no ${folder}/${name}.glb: "${name}" clip left out)`);
  }

  const base = sources.find((source) => !source.rotationsOnly);
  if (!base) throw new Error(`No export of ${folder} itself to take the mesh from`);
  const document = await io.read(base.path);
  const root = document.getRoot();
  // Meshy adds a one-frame ".001" rest pose next to each clip; the clips are copied in below.
  root.listAnimations().forEach((animation) => animation.dispose());

  for (const source of sources) {
    const clip = await io.read(source.path);
    addAnimation(document, source.name, channelsOf(clip.getRoot().listAnimations()[0], source));
  }
  for (const [name, parts] of Object.entries(sequences)) {
    const played = [];
    for (const part of parts) {
      const [, file, from, mode] = part.match(/^([^@:]+)(?:@([\d.]+))?(?::(\w+))?$/);
      const clip = await io.read(ownExport(file));
      const channels = channelsOf(clip.getRoot().listAnimations()[0], {});
      played.push({ channels: from ? trimStart(channels, Number(from)) : channels, reverse: mode === "reverse" });
    }
    addAnimation(document, name, joinParts(played, name));
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
 * The channels of `animation` as plain keyframes, each naming its bone. `rotationsOnly` leaves out
 * the translations, which carry the source body's bone lengths.
 */
function channelsOf(animation, { rotationsOnly = false }) {
  return animation
    .listChannels()
    .filter((channel) => !rotationsOnly || channel.getTargetPath() === "rotation")
    .map((channel) => {
      const sampler = channel.getSampler();
      return {
        bone: channel.getTargetNode().getName(),
        path: channel.getTargetPath(),
        interpolation: sampler.getInterpolation(),
        times: Array.from(sampler.getInput().getArray()),
        values: Array.from(sampler.getOutput().getArray()),
        size: sampler.getOutput().getElementSize(),
      };
    });
}

/**
 * The channels from `from` seconds on, shifted to start at 0 (a keyframe is kept just before). The
 * hips are moved back over the ground spot the clip started on, so a trimmed clip doesn't begin
 * a few steps away from the figure.
 */
function trimStart(channels, from) {
  return channels.map((channel) => {
    const first = Math.max(0, channel.times.findIndex((time) => time >= from) - 1);
    const values = channel.values.slice(first * channel.size);
    if (channel.bone.endsWith("Hips") && channel.path === "translation") {
      const [dx, , dz] = [0, 1, 2].map((axis) => values[axis] - channel.values[axis]);
      for (let index = 0; index < values.length; index += 3) {
        values[index] -= dx;
        values[index + 2] -= dz;
      }
    }
    return { ...channel, times: channel.times.slice(first).map((time) => Math.max(0, time - from)), values };
  });
}

/**
 * One clip made of several played back to back, some backwards (`reverse`), each starting
 * SEQUENCE_BLEND_SECONDS after the last ends so the pose eases from one into the next. Every part
 * must animate the same bones, with linear keyframes (so a part can be turned around).
 */
function joinParts(parts, name) {
  const key = (channel) => `${channel.bone}/${channel.path}`;
  const [first] = parts;
  for (const part of parts) {
    if (part.channels.some((channel) => channel.interpolation !== "LINEAR"))
      throw new Error(`Sequence "${name}": every part must have linear keyframes`);
    if (part.channels.length !== first.channels.length)
      throw new Error(`Sequence "${name}": its parts animate different bones`);
  }
  const lengthOf = (part) => Math.max(...part.channels.map((channel) => channel.times.at(-1)));
  const joined = new Map(first.channels.map((channel) => [key(channel), { ...channel, times: [], values: [] }]));
  let start = 0;
  for (const part of parts) {
    const length = lengthOf(part);
    for (const channel of part.channels) {
      const target = joined.get(key(channel));
      if (!target) throw new Error(`Sequence "${name}": its parts animate different bones`);
      const frames = channel.times.map((time, index) => ({
        time: part.reverse ? length - time : time,
        value: channel.values.slice(index * channel.size, (index + 1) * channel.size),
      }));
      if (part.reverse) frames.reverse();
      for (const { time, value } of frames) {
        target.times.push(start + time);
        target.values.push(...value);
      }
    }
    start += length + SEQUENCE_BLEND_SECONDS;
  }
  return [...joined.values()];
}

/**
 * Adds a clip named `name` to `target` from plain keyframes. Every export shares the same skeleton
 * (Meshy's Mixamo rig), so channels find their bones by name.
 */
function addAnimation(target, name, channels) {
  const root = target.getRoot();
  const buffer = root.listBuffers()[0];
  const bones = new Map(root.listNodes().map((node) => [node.getName(), node]));
  const animation = target.createAnimation(name);
  const accessor = (type, array) => target.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  const types = { 3: "VEC3", 4: "VEC4" };

  for (const channel of channels) {
    const bone = bones.get(channel.bone);
    if (!bone) throw new Error(`Clip "${name}" animates "${channel.bone}", missing from the base model`);
    const values = new Float32Array(channel.values);
    if (IN_PLACE_CLIPS.includes(name) && channel.path === "translation" && bone.getName().endsWith("Hips")) {
      pinHorizontally(values, KEPT_TRAVEL[name] ?? 0);
    }
    const sampler = target
      .createAnimationSampler()
      .setInput(accessor("SCALAR", new Float32Array(channel.times)))
      .setOutput(accessor(types[channel.size], values))
      .setInterpolation(channel.interpolation);
    animation.addSampler(sampler);
    animation.addChannel(
      target.createAnimationChannel().setTargetNode(bone).setTargetPath(channel.path).setSampler(sampler),
    );
  }
}

/**
 * Keeps the hips over their first-frame spot on the ground (but for the `kept` share of their
 * travel), leaving the height alone: Meshy moves followed a traveling figure, so a lunge would end
 * a step away and snap back into the idle.
 */
function pinHorizontally(positions, kept) {
  const [x, , z] = positions;
  for (let index = 0; index < positions.length; index += 3) {
    positions[index] = x + (positions[index] - x) * kept;
    positions[index + 2] = z + (positions[index + 2] - z) * kept;
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
