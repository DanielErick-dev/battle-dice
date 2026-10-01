"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { AdditiveBlending, Color, DoubleSide, Vector3, type Group, type MeshBasicMaterial, type Object3D } from "three";
import { useAge } from "../useAge";
import { jag, noise, stripsGeometry, writeStrip } from "./boltStrips";
import { findBone, placeInWorld } from "./worldPlacement";

/** Positions kept of each limb, one per frame at 60 fps: the bolt spans this much of its path. */
const TRAIL_SAMPLES = 16;
const SAMPLE_SECONDS = 1 / 60;
/** Straight runs a bolt is broken into, and a limb's path shorter than this (share of the figure's height) draws none. */
const BOLT_SEGMENTS = 7;
const MIN_BOLT_LENGTH = 0.05;
/** A fork off every bolt: its length as a share of the bolt's, and how far it veers off. */
const BRANCH_LENGTH = 0.4;
const BRANCH_ANGLE = 0.9;
/** Half-widths of the glow and the white-hot core, as shares of the figure's height. */
const GLOW_WIDTH = 0.008;
const CORE_WIDTH = 0.0025;
/** Times per second the bolts jump to a new shape, and the share of those a bolt skips (it crackles). */
const FLICKER_RATE = 22;
const SKIP_CHANCE = 0.25;
/** Per second: how fast the lightning flares up as the intro starts and dies down once it's over. */
const FADE_RATE = 2.5;
/** Arcs jumping from hand to hand: how often one fires and how long it lasts. */
const ARC_EVERY = 0.35;
const ARC_SECONDS = 0.09;

/** Sparks crackling off each hand while charged, and how far they reach (share of the figure's height). */
const SPARKS_PER_HAND = 3;
const SPARK_MIN = 0.05;
const SPARK_MAX = 0.13;

/**
 * A strike from the sky (see `strikeSeconds`): how long it shows (at full strength for the first
 * part), how high it starts over the figure (shares of its height), how wide its bolt is against
 * the limbs', and the column of light and the flash on the ground round it.
 */
const STRIKE_SECONDS = 0.75;
const STRIKE_PEAK = 0.18;
const STRIKE_HEIGHT = 3.4;
const STRIKE_WIDTH = 8;
const STRIKE_COLUMN = 0.09;
const STRIKE_FLASH = 0.9;

const LIMBS = ["RightHand", "LeftHand", "RightFoot", "LeftFoot"] as const;
/** Each limb draws a bolt and its fork, each hand its sparks; then the arc between the hands and a strike's bolt. */
const SPARK_STRIP = LIMBS.length * 2;
const ARC_STRIP = SPARK_STRIP + SPARKS_PER_HAND * 2;
const STRIKE_STRIP = ARC_STRIP + 1;
const STRIPS = STRIKE_STRIP + 1;
const POINTS = BOLT_SEGMENTS + 1;

/** Working vectors for the frame loop (frames run one at a time, so instances can share them). */
const scratch = {
  point: new Vector3(),
  side: new Vector3(),
  toCamera: new Vector3(),
  along: new Vector3(),
  a: new Vector3(),
};
/** A bolt's points in world space, rebuilt for every strip. */
const bolt = Array.from({ length: POINTS }, () => new Vector3());

/**
 * Lightning crackling off the figure's hands and feet as it moves: every swing leaves a
 * thin, jagged, forked bolt along the limb's path that flickers into new shapes, and now and
 * then an arc jumps between the hands. A limb that barely moves draws none, so the faster the
 * move, the longer the bolt. Lit while `active` (the intro on the menus, a lightning dash in a
 * match), it dies down after. While `charged`, sparks crackle off both hands even standing still
 * (the power gathering before the dash). At `strikeSeconds` after mounting (an intro's
 * landing), one thick bolt falls straight from the sky through the figure into the ground,
 * inside a column of light, flashing on the floor. Placed in world space from the bones, so it follows the figure
 * wherever it stands.
 */
export function LimbLightning({
  figure,
  size,
  color,
  active,
  charged,
  strikeSeconds,
}: {
  figure: Object3D;
  size: number;
  color: string;
  active: RefObject<boolean>;
  charged?: RefObject<boolean>;
  strikeSeconds?: number;
}) {
  const root = useRef<Group>(null);
  const glowMaterial = useRef<MeshBasicMaterial>(null);
  const coreMaterial = useRef<MeshBasicMaterial>(null);
  const bones = useMemo(() => LIMBS.map((name) => findBone(figure, name)), [figure]);
  const hips = useMemo(() => findBone(figure, "Hips"), [figure]);
  const strike = useRef<Group>(null);
  const flash = useRef<Group>(null);
  const flashMaterial = useRef<MeshBasicMaterial>(null);
  const columnMaterial = useRef<MeshBasicMaterial>(null);
  const age = useAge();
  const glow = useMemo(() => new Color(color).multiplyScalar(1.4), [color]);
  const { glowGeometry, coreGeometry } = useMemo(
    () => ({ glowGeometry: stripsGeometry(STRIPS, POINTS), coreGeometry: stripsGeometry(STRIPS, POINTS) }),
    [],
  );
  useEffect(
    () => () => [glowGeometry, coreGeometry].forEach((geometry) => geometry.dispose()),
    [glowGeometry, coreGeometry],
  );
  /** Each limb's recent world positions, newest first. */
  const trails = useMemo(() => LIMBS.map(() => [] as Vector3[]), []);
  const power = useRef(0);
  const charge = useRef(0);
  const sinceSample = useRef(0);
  /** The current shape: a seed per strip (null skips the strip this flicker), and when it was drawn. */
  const shape = useRef<{ seeds: (number | null)[]; at: number }>({ seeds: [], at: -1 });
  const arcFiredAt = useRef(-Infinity);

  useFrame(({ clock, camera }, delta) => {
    const group = root.current;
    if (!group) return;
    const t = clock.elapsedTime;
    const fade = Math.min(1, delta * FADE_RATE);
    power.current += ((active.current ? 1 : 0) - power.current) * fade;
    charge.current += ((charged?.current ? 1 : 0) - charge.current) * fade;

    // Take the limbs' positions at a steady rate, so a bolt's length follows the limb's speed.
    sinceSample.current += delta;
    const sample = sinceSample.current >= SAMPLE_SECONDS;
    if (sample) sinceSample.current = 0;
    bones.forEach((bone, index) => {
      if (!bone) return;
      const trail = trails[index];
      const head = bone.getWorldPosition(scratch.point);
      if (sample || trail.length === 0) {
        trail.unshift(head.clone());
        if (trail.length > TRAIL_SAMPLES) trail.pop();
      } else {
        trail[0].copy(head);
      }
    });

    if (t - shape.current.at > 1 / FLICKER_RATE) {
      shape.current = {
        seeds: Array.from({ length: STRIPS }, () => (Math.random() < SKIP_CHANCE ? null : Math.random() * 1000)),
        at: t,
      };
    }
    if ((active.current || charged?.current) && t - arcFiredAt.current > ARC_EVERY * (0.6 + Math.random() * 0.8))
      arcFiredAt.current = t;
    const { seeds } = shape.current;
    const draw = (strip: number, width: number) => {
      writeStrip(glowGeometry, strip, bolt, width * GLOW_WIDTH * size, camera.position, group);
      writeStrip(coreGeometry, strip, bolt, width * CORE_WIDTH * size, camera.position, group);
    };

    trails.forEach((trail, index) => {
      const seed = seeds[index * 2];
      const lit = seed !== null && seed !== undefined && resample(trail, bolt, MIN_BOLT_LENGTH * size);
      if (lit) jag(bolt, seed, size);
      draw(index * 2, lit ? power.current : 0);
      // The fork leaves the bolt at one of its middle kinks and veers off to one side.
      const branchSeed = seeds[index * 2 + 1];
      const forked = lit && branchSeed !== null && branchSeed !== undefined;
      if (forked) branch(bolt, branchSeed, camera.position, size);
      draw(index * 2 + 1, forked ? 0.7 * power.current : 0);
    });

    // Sparks shooting off the hands in every direction, a new spray every flicker.
    bones.slice(0, 2).forEach((hand, side) => {
      for (let k = 0; k < SPARKS_PER_HAND; k++) {
        const strip = SPARK_STRIP + side * SPARKS_PER_HAND + k;
        const seed = seeds[strip];
        const lit = hand !== null && seed !== null && seed !== undefined && charge.current > 0.01;
        if (lit) spark(hand.getWorldPosition(scratch.a), seed, size);
        draw(strip, lit ? 0.8 * charge.current : 0);
      }
    });

    const [right, left] = bones;
    const arcAge = t - arcFiredAt.current;
    const arcLit = arcAge < ARC_SECONDS && right && left && seeds[ARC_STRIP] != null;
    if (arcLit) {
      right.getWorldPosition(scratch.a);
      left.getWorldPosition(scratch.point);
      bolt.forEach((point, k) => point.lerpVectors(scratch.a, scratch.point, k / BOLT_SEGMENTS));
      jag(bolt, seeds[ARC_STRIP]!, size);
    }
    draw(ARC_STRIP, arcLit ? 1.2 * (1 - arcAge / ARC_SECONDS) * Math.max(power.current, charge.current) : 0);

    // The strike: one thick bolt straight down from the sky through him into the ground.
    const sinceStrike = strikeSeconds === undefined ? Infinity : age(t) - strikeSeconds;
    const striking = sinceStrike >= 0 && sinceStrike < STRIKE_SECONDS && hips !== null;
    const strength = striking
      ? Math.min(1, (STRIKE_SECONDS - sinceStrike) / (STRIKE_SECONDS - STRIKE_PEAK)) * (0.8 + 0.2 * Math.sin(t * 70))
      : 0;
    if (striking) {
      hips.getWorldPosition(scratch.a);
      scratch.a.y = group.getWorldPosition(scratch.point).y;
      scratch.point.copy(scratch.a).setY(scratch.a.y + STRIKE_HEIGHT * size);
      // It drops from the sky in the first instant, then stays lit, crackling.
      const reach = Math.min(1, sinceStrike / 0.05);
      bolt.forEach((point, k) => point.lerpVectors(scratch.point, scratch.a, (k / BOLT_SEGMENTS) * reach));
      jag(bolt, seeds[STRIKE_STRIP] ?? 7, size * 1.6);
    }
    draw(STRIKE_STRIP, STRIKE_WIDTH * strength);
    // A column of light round the bolt, and a flash spreading over the floor where it goes to ground.
    if (strike.current && flashMaterial.current && columnMaterial.current) {
      strike.current.visible = striking;
      if (striking) {
        placeInWorld(strike.current, group, scratch.a, size);
        flash.current?.scale.setScalar(STRIKE_FLASH * (0.35 + sinceStrike * 1.8));
      }
      flashMaterial.current.opacity = strength;
      columnMaterial.current.opacity = 0.35 * strength;
    }

    // Each strip fades with its own power through its width; the materials stay lit.
    if (glowMaterial.current) glowMaterial.current.opacity = 0.8;
    if (coreMaterial.current) coreMaterial.current.opacity = 1;
  });

  const material = (ref: RefObject<MeshBasicMaterial | null>, tint: Color | string) => (
    <meshBasicMaterial
      ref={ref}
      color={tint}
      side={DoubleSide}
      transparent
      opacity={0}
      depthWrite={false}
      blending={AdditiveBlending}
      toneMapped={false}
    />
  );

  return (
    <group ref={root}>
      <mesh geometry={glowGeometry} frustumCulled={false}>
        {material(glowMaterial, glow)}
      </mesh>
      <mesh geometry={coreGeometry} frustumCulled={false}>
        {material(coreMaterial, "#fffbe6")}
      </mesh>
      <group ref={strike} visible={false}>
        <group ref={flash}>
          <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
            <ringGeometry args={[0.15, 1, 48]} />
            {material(flashMaterial, glow)}
          </mesh>
        </group>
        <mesh position-y={STRIKE_HEIGHT / 2}>
          <cylinderGeometry args={[STRIKE_COLUMN, STRIKE_COLUMN * 1.6, STRIKE_HEIGHT, 24, 1, true]} />
          {material(columnMaterial, glow)}
        </mesh>
      </group>
    </group>
  );
}

/**
 * Spreads `out` evenly along the trail's path (newest point first). False when the path is
 * shorter than `minLength`: the limb is barely moving.
 */
function resample(trail: readonly Vector3[], out: Vector3[], minLength: number): boolean {
  if (trail.length < 2) return false;
  let total = 0;
  for (let i = 1; i < trail.length; i++) total += trail[i].distanceTo(trail[i - 1]);
  if (total < minLength) return false;
  let i = 1;
  let walked = 0;
  out.forEach((point, k) => {
    const target = (total * k) / (out.length - 1);
    while (i < trail.length - 1 && walked + trail[i].distanceTo(trail[i - 1]) < target) {
      walked += trail[i].distanceTo(trail[i - 1]);
      i++;
    }
    const step = trail[i].distanceTo(trail[i - 1]) || 1;
    point.lerpVectors(trail[i - 1], trail[i], Math.min(1, (target - walked) / step));
  });
  return true;
}

/** Lays the bolt out as a spark from `from`, off in a random direction, then jagged. */
function spark(from: Vector3, seed: number, size: number) {
  scratch.along
    .set(noise(seed + 1) - 0.5, noise(seed + 2) - 0.5, noise(seed + 3) - 0.5)
    .normalize()
    .multiplyScalar(size * (SPARK_MIN + (SPARK_MAX - SPARK_MIN) * noise(seed + 4)));
  bolt.forEach((point, k) => point.copy(from).addScaledVector(scratch.along, k / BOLT_SEGMENTS));
  jag(bolt, seed + 5, size * 0.5);
}

/** Turns `points` (a lit bolt) into its fork: from a middle kink, off to one side, then jagged. */
function branch(points: Vector3[], seed: number, cameraPosition: Vector3, size: number) {
  const from = points[1 + Math.floor(noise(seed) * (points.length - 3))].clone();
  scratch.along.subVectors(points.at(-1)!, points[0]);
  const length = scratch.along.length() * BRANCH_LENGTH;
  scratch.toCamera.subVectors(cameraPosition, from);
  scratch.side.crossVectors(scratch.along, scratch.toCamera).normalize();
  const direction = scratch.along
    .normalize()
    .addScaledVector(scratch.side, (noise(seed + 9) < 0.5 ? -1 : 1) * BRANCH_ANGLE)
    .normalize();
  points.forEach((point, k) => point.copy(from).addScaledVector(direction, (length * k) / (points.length - 1)));
  jag(points, seed + 31, size * 0.6);
}
