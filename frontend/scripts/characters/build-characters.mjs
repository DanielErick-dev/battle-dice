#!/usr/bin/env node
// Merges each character's Meshy exports into one compressed GLB. Usage: docs/assets.md.
import { access, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, resample, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { Matrix4, Quaternion, Vector3 } from "three";
import { CHARACTER_MODELS, OPTIONAL_CLIPS, REQUIRED_CLIPS, SHARED_CLIPS } from "./manifest.mjs";

const OUTPUT_DIR = path.resolve(fileURLToPath(import.meta.url), "../../../public/models/characters");
/** Plenty for a figure that fills a fraction of the screen; the heaviest export has ~100k. */
const TARGET_VERTICES = 24_000;
const TEXTURE_SIZE = 1024;
/** Clips played on one spot (menu stage, ability), so the figure never wanders off it. */
const IN_PLACE_CLIPS = [
  "intro",
  "showcase",
  "cast",
  "float",
  "land",
  "dash",
  "shove",
  "knocked",
  "rest",
  "hop",
  "brake",
  "sit",
  "guard",
  "scoff",
];
/** Share of travel an in-place clip keeps: a dash lunges forward a little yet stays on its tile. */
const KEPT_TRAVEL = { dash: 0.4 };
/** Gap between two parts of a sequence, for the pose to blend. */
const SEQUENCE_BLEND_SECONDS = 0.3;
/** How high a `grounded` part keeps the lowest joint off the floor (joints sit inside the body). */
const GROUND_CLEARANCE = 0.06;

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

// Borrowed clips keep only bone rotations, so they don't take on the lender's proportions; shared
// ones (SHARED_CLIPS) also keep the hips' height, scaled to this body, so a fall reaches the floor.
async function buildCharacter(model, output) {
  const { id: folder, fallbacks = {}, sequences = {} } = model;
  const ownExport = (clip) => exportOf(model, clip);
  const basePath = await firstExisting(REQUIRED_CLIPS.map(ownExport));
  if (!basePath) throw new Error(`No export of ${folder} itself to take the mesh from`);
  const document = await io.read(basePath);
  const root = document.getRoot();
  // Meshy adds a one-frame ".001" rest pose next to each clip; the clips are copied in below.
  root.listAnimations().forEach((animation) => animation.dispose());

  for (const name of REQUIRED_CLIPS) {
    if (await exists(ownExport(name))) addAnimation(document, name, await exportChannels(ownExport(name)));
    else if (fallbacks[name]) {
      const lender = CHARACTER_MODELS[fallbacks[name]];
      console.warn(`  (no ${folder}/${name}.glb: borrowed from ${lender.id})`);
      addAnimation(document, name, borrowed(await exportChannels(exportOf(lender, name)), { hipsScale: null }));
    } else throw new Error(`Missing ${ownExport(name)}`);
  }
  for (const name of OPTIONAL_CLIPS) {
    const lender = SHARED_CLIPS[name] && CHARACTER_MODELS[SHARED_CLIPS[name]];
    if (sequences[name]) addAnimation(document, name, await sequenceChannels(model, name));
    else if (lender && (lender === model || !(await exists(ownExport(name))))) {
      const channels = await clipChannels(lender, name);
      if (!channels) {
        console.warn(`  (no ${lender.id}/${name}.glb: shared "${name}" clip left out)`);
        continue;
      }
      const lenderRest = restHipsHeight(await io.read(exportOf(lender, REQUIRED_CLIPS[0])));
      const own = borrowed(channels, { hipsScale: restHipsHeight(document) / lenderRest });
      addAnimation(document, name, name === "rest" ? handsOnLap(stillPose(own), document) : own);
    } else if (await exists(ownExport(name))) addAnimation(document, name, await exportChannels(ownExport(name)));
    else console.warn(`  (no ${folder}/${name}.glb: "${name}" clip left out)`);
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

function exportOf(model, clip) {
  return path.join(values.source, model.id, `${clip}.glb`);
}

/** A clip as the manifest makes it (a sequence, or the export), or null without one. */
async function clipChannels(model, name) {
  if (model.sequences?.[name]) return sequenceChannels(model, name);
  return (await exists(exportOf(model, name))) ? exportChannels(exportOf(model, name)) : null;
}

/** A Meshy export's only animation, as plain keyframes. */
async function exportChannels(file) {
  return channelsOf((await io.read(file)).getRoot().listAnimations()[0]);
}

/** A clip from parts played back to back, each `file@from-to*speed:mode` (syntax: docs/assets.md). */
async function sequenceChannels(model, name) {
  const played = [];
  // Parts made on an earlier body (`retargetParts`) keep only rotations and the hips, scaled to this one.
  const bodyHips = model.retargetParts && restHipsHeight(await io.read(exportOf(model, REQUIRED_CLIPS[0])));
  for (const part of model.sequences[name]) {
    const [, file, from, to, speed, mode] = part.match(
      /^([^@:*]+)(?:@([\d.]+)(?:-([\d.]+))?)?(?:\*([\d.]+))?(?::(\w+))?$/,
    );
    const clip = await io.read(path.join(values.source, model.id, "parts", `${file}.glb`));
    let channels = channelsOf(clip.getRoot().listAnimations()[0]);
    if (mode === "grounded") channels = grounded(channels, clip);
    if (bodyHips) channels = borrowed(channels, { hipsScale: bodyHips / restHipsHeight(clip) });
    if (to) channels = trimEnd(channels, Number(to));
    if (from) channels = trimStart(channels, Number(from));
    if (speed)
      channels = channels.map((channel) => ({ ...channel, times: channel.times.map((t) => t / Number(speed)) }));
    played.push({ channels, reverse: mode === "reverse" });
  }
  return joinParts(played, name);
}

function channelsOf(animation) {
  return animation.listChannels().map((channel) => {
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

/** Rotations only (translations carry the lender's bone lengths); with `hipsScale`, also the scaled hips. */
function borrowed(channels, { hipsScale }) {
  return channels
    .filter(
      (channel) =>
        channel.path === "rotation" ||
        (hipsScale !== null && channel.bone.endsWith("Hips") && channel.path === "translation"),
    )
    .map((channel) =>
      channel.path === "translation"
        ? { ...channel, values: channel.values.map((value) => value * hipsScale) }
        : channel,
    );
}

/**
 * Moves the hips frame by frame so the lowest joint stays GROUND_CLEARANCE off the floor: some Meshy
 * library moves (getting up) are exported sunk below it, drifting. `document` is the channels' export.
 */
function grounded(channels, document) {
  const nodes = document.getRoot().listNodes();
  const parentOf = parentsOf(nodes);
  const hipsNode = nodes.find((node) => node.getName().endsWith("Hips"));
  const body = [];
  const gather = (node) => {
    body.push(node);
    node.listChildren().forEach(gather);
  };
  gather(hipsNode);
  const animated = channelMap(channels);
  const hips = animated.get(`${hipsNode.getName()}/translation`);
  const values = [...hips.values];

  hips.times.forEach((time, frame) => {
    const worldOf = worldPose(animated, parentOf, time);
    const lowest = Math.min(...body.map((node) => worldOf(node).elements[13]));
    values[frame * 3 + 1] += GROUND_CLEARANCE - lowest;
  });
  return channels.map((channel) => (channel === hips ? { ...channel, values } : channel));
}

/** The clip's first pose held still (two keyframes a second apart, so it still loops). */
function stillPose(channels) {
  return channels.map((channel) => ({
    ...channel,
    times: [0, 1],
    values: [...channel.values.slice(0, channel.size), ...channel.values.slice(0, channel.size)],
  }));
}

/**
 * The shared rest clip's hands hover over the lender's belly, over nothing on another body: two-bone IK
 * (elbow kept on its side) lays them on the uppermost thigh near the knee. `document` is the receiving body.
 */
function handsOnLap(channels, document) {
  const nodes = document.getRoot().listNodes();
  const parentOf = parentsOf(nodes);
  const bone = (name) => nodes.find((node) => node.getName().endsWith(`:${name}`) || node.getName() === name);
  const animated = channelMap(channels);
  const rotationOf = (node) => node && animated.get(`${node.getName()}/rotation`);
  const sides = ["Left", "Right"].map((side) => ({
    side,
    arm: bone(`${side}Arm`),
    fore: bone(`${side}ForeArm`),
    // The fingertips are what rests on the thigh (the wrist bone sits a hand short of them).
    hand: bone(`${side}HandMiddle4`) ?? bone(`${side}Hand`),
  }));
  const legs = ["Left", "Right"].map((side) => ({ hip: bone(`${side}UpLeg`), knee: bone(`${side}Leg`) }));
  if (sides.some(({ arm, fore, hand }) => !rotationOf(arm) || !rotationOf(fore) || !hand)) return channels;
  if (legs.some(({ hip, knee }) => !hip || !knee)) return channels;

  const replaced = new Map();
  for (const { side, arm, fore, hand } of sides) {
    const armChannel = rotationOf(arm);
    const times = armChannel.times;
    const armValues = [];
    const foreValues = [];
    for (const time of times) {
      const worldOf = worldPose(animated, parentOf, time);
      const position = (node) => new Vector3().setFromMatrixPosition(worldOf(node));
      const rotation = (node) => {
        const q = new Quaternion();
        worldOf(node).decompose(new Vector3(), q, new Vector3());
        return q;
      };

      const shoulder = position(arm);
      const elbow = position(fore);
      const wrist = position(hand);
      const upper = elbow.distanceTo(shoulder);
      const lower = wrist.distanceTo(elbow);
      // As far towards the knee as the arm reaches unlocked; the crossed-over thigh if in reach, else the hand's own.
      const [left, right] = legs.map(({ hip, knee }) => ({ hip: position(hip), knee: position(knee) }));
      const across = new Vector3().subVectors(left.hip, right.hip).normalize();
      const restOn = (leg) => {
        const thigh = leg.knee.distanceTo(leg.hip);
        const at = (share) =>
          leg.hip
            .clone()
            .lerp(leg.knee, share)
            .addScaledVector(new Vector3(0, 1, 0), thigh * 0.25)
            .addScaledVector(across, (side === "Left" ? 1 : -1) * thigh * 0.12);
        let share = 0.75;
        while (share > 0.1 && at(share).distanceTo(shoulder) > (upper + lower) * 0.97) share -= 0.05;
        return { share, target: at(share) };
      };
      const lap = restOn(left.knee.y >= right.knee.y ? left : right);
      const own = restOn(side === "Left" ? left : right);
      const { target } = lap.share >= 0.35 || lap.share >= own.share ? lap : own;

      const reach = Math.min(
        upper + lower - 1e-4,
        Math.max(Math.abs(upper - lower) + 1e-4, target.distanceTo(shoulder)),
      );
      const aim = new Vector3().subVectors(target, shoulder).normalize();
      // The elbow keeps to the side it bends to now.
      const out = new Vector3().subVectors(elbow, shoulder);
      out.addScaledVector(aim, -out.dot(aim));
      if (out.lengthSq() < 1e-10) out.set(0, -1, 0).addScaledVector(aim, aim.y);
      out.normalize();
      const cos = (upper * upper + reach * reach - lower * lower) / (2 * upper * reach);
      const angle = Math.acos(Math.min(1, Math.max(-1, cos)));
      const newElbow = shoulder
        .clone()
        .addScaledVector(aim, upper * Math.cos(angle))
        .addScaledVector(out, upper * Math.sin(angle));
      const newWrist = shoulder.clone().addScaledVector(aim, reach);

      const turnArm = new Quaternion().setFromUnitVectors(
        elbow.clone().sub(shoulder).normalize(),
        newElbow.clone().sub(shoulder).normalize(),
      );
      const movedWrist = wrist.clone().sub(shoulder).applyQuaternion(turnArm).add(shoulder);
      const turnFore = new Quaternion().setFromUnitVectors(
        movedWrist.sub(newElbow).normalize(),
        newWrist.clone().sub(newElbow).normalize(),
      );
      const armWorld = turnArm.clone().multiply(rotation(arm));
      const foreWorld = turnFore.clone().multiply(turnArm).multiply(rotation(fore));
      const armLocal = rotation(parentOf.get(arm)).invert().multiply(armWorld);
      const foreLocal = armWorld.clone().invert().multiply(foreWorld);
      armValues.push(...armLocal.toArray());
      foreValues.push(...foreLocal.toArray());
    }
    replaced.set(armChannel, { ...armChannel, values: armValues });
    replaced.set(rotationOf(fore), { ...rotationOf(fore), times: [...times], values: foreValues });
  }
  return channels.map((channel) => replaced.get(channel) ?? channel);
}

function parentsOf(nodes) {
  const parentOf = new Map();
  for (const node of nodes) for (const child of node.listChildren()) parentOf.set(child, node);
  return parentOf;
}

/** Channels keyed by `bone/path`. */
function channelMap(channels) {
  return new Map(channels.map((channel) => [`${channel.bone}/${channel.path}`, channel]));
}

/** A memoized node → world matrix lookup at `time`, unanimated nodes at their rest pose. */
function worldPose(animated, parentOf, time) {
  const world = new Map();
  const worldOf = (node) => {
    if (world.has(node)) return world.get(node);
    const at = (pathName, rest) => {
      const channel = animated.get(`${node.getName()}/${pathName}`);
      return channel ? sampleChannel(channel, time) : rest;
    };
    const local = new Matrix4().compose(
      new Vector3().fromArray(at("translation", node.getTranslation())),
      new Quaternion().fromArray(at("rotation", node.getRotation())).normalize(),
      new Vector3().fromArray(at("scale", node.getScale())),
    );
    const parent = parentOf.get(node);
    const matrix = parent ? worldOf(parent).clone().multiply(local) : local;
    world.set(node, matrix);
    return matrix;
  };
  return worldOf;
}

/** A channel's value at `time`, linear between keyframes. */
function sampleChannel(channel, time) {
  const { times, values, size } = channel;
  const next = times.findIndex((t) => t >= time);
  if (next <= 0) return values.slice(next < 0 ? (times.length - 1) * size : 0, (next < 0 ? times.length : 1) * size);
  const share = (time - times[next - 1]) / (times[next] - times[next - 1]);
  return Array.from({ length: size }, (_, axis) => {
    const from = values[(next - 1) * size + axis];
    return from + (values[next * size + axis] - from) * share;
  });
}

async function firstExisting(files) {
  for (const file of files) if (await exists(file)) return file;
  return null;
}

/** Hips height in the rest pose, in the rig's units. */
function restHipsHeight(document) {
  const hips = document
    .getRoot()
    .listNodes()
    .find((node) => node.getName().endsWith("Hips"));
  if (!hips) throw new Error("No hips bone in the rig");
  return hips.getTranslation()[1];
}

/** From `from` seconds on, shifted to 0; hips moved back over the start spot so it doesn't begin steps away. */
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

/** Up to `to` seconds, keeping one keyframe past it. */
function trimEnd(channels, to) {
  return channels.map((channel) => {
    const index = channel.times.findIndex((time) => time >= to);
    const kept = index < 0 ? channel.times.length : index + 1;
    return { ...channel, times: channel.times.slice(0, kept), values: channel.values.slice(0, kept * channel.size) };
  });
}

/** Parts back to back, SEQUENCE_BLEND_SECONDS apart; all must animate the same bones linearly (so they can reverse). */
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

/** Every export shares Meshy's Mixamo rig, so channels find their bones by name. */
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

/** Pins the hips over their first-frame spot (but for `kept` of the travel), else a lunge snaps back into the idle. */
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
