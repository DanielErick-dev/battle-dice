"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  CubicBezierCurve3,
  Line,
  LineBasicMaterial,
  Matrix4,
  Quaternion,
  TubeGeometry,
  Vector3,
  CatmullRomCurve3,
  type Group,
  type Mesh,
  type Object3D,
} from "three";
import type { IntroArrowBeats } from "../../characters";
import { useAge } from "../useAge";
import { ARROW_LENGTH, LightArrow, useArrowMaterials, useGlowMaterial } from "./ArrowRain";
import { findBone, placeInWorld } from "./worldPlacement";

/** The bow, as shares of the figure's height: half its length, and how far its limbs bow forward. */
const BOW_HALF = 0.28;
const BOW_BULGE = 0.09;
/** The arrows' size on the stage, against their size on the board (ARROW_LENGTH). */
const ARROW_SCALE = 0.42;
/** Seconds for the bow to appear, the arrow to fly up and burst, and the burst to spread. */
const BOW_APPEAR = 0.4;
const FLIGHT_SECONDS = 0.8;
const BURST_SECONDS = 0.6;
/** The ring of arrows raining round her: how many, how far out, how high from and how long each falls. */
const RING_ARROWS = 12;
const RING_RADIUS = 0.42;
const RAIN_HEIGHT = 2.2;
const RAIN_SECONDS = 0.22;
const RAIN_STAGGER = 0.035;
/** Points kept of the flying arrow's trail. */
const TRAIL_POINTS = 24;
/** Per second: how fast the bow fades once the intro is over. */
const FADE_RATE = 2.5;
/** The ring of arrows stays stuck this long after the burst (past the intro's end), then fades this long. */
const RING_HOLD = 4;
const RING_FADE = 1.2;

const scratch = {
  left: new Vector3(),
  right: new Vector3(),
  aim: new Vector3(),
  up: new Vector3(),
  side: new Vector3(),
  point: new Vector3(),
  basis: new Matrix4(),
  quaternion: new Quaternion(),
  down: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI),
  hips: new Vector3(),
};
const UP = new Vector3(0, 1, 0);

/**
 * The Elven Archer's intro, all light: a bow appears in her left hand, its string drawn to her
 * right as she aims, an arrow nocked and brightening; at `releaseSeconds` it flies off the way
 * she aims, curls up into the sky trailing green and bursts, and a ring of arrows rains down
 * round her, stuck in the pedestal for a while after (the bow fades once the intro is over). Placed in world
 * space from her bones. Mounted fresh with every intro.
 */
export function ArcherIntro({
  figure,
  size,
  color,
  beats,
  active,
}: {
  figure: Object3D;
  size: number;
  color: string;
  beats: IntroArrowBeats;
  active: RefObject<boolean>;
}) {
  const root = useRef<Group>(null);
  const bow = useRef<Group>(null);
  const nocked = useRef<Group>(null);
  const flying = useRef<Group>(null);
  const trail = useRef<Mesh>(null);
  const burst = useRef<Mesh>(null);
  const ring = useRef<(Group | null)[]>([]);
  const glow = useMemo(() => new Color(color).multiplyScalar(2.4), [color]);
  const arrows = useArrowMaterials(glow);
  const ringArrows = useArrowMaterials(glow);
  const bowMaterial = useGlowMaterial(glow);
  const trailMaterial = useGlowMaterial(glow);
  const burstMaterial = useGlowMaterial(glow);
  const hands = useMemo(
    () => ({
      left: findBone(figure, "LeftHand"),
      right: findBone(figure, "RightHand"),
      hips: findBone(figure, "Hips"),
    }),
    [figure],
  );
  const age = useAge();
  const presence = useRef(0);
  /** Where and which way the arrow left the bow; where its flight ends, over her. */
  const shot = useRef<{ from: Vector3; aim: Vector3; curve: CubicBezierCurve3 } | null>(null);
  const trailPoints = useRef<Vector3[]>([]);

  const bowGeometry = useMemo(() => {
    // Grip at the origin, limbs bowing forward (+X) and back to the tips behind it.
    const points = Array.from({ length: 17 }, (_, i) => {
      const y = (i / 16 - 0.5) * 2 * BOW_HALF;
      return new Vector3(BOW_BULGE * (1 - (y / BOW_HALF) ** 2) - BOW_BULGE, y, 0);
    });
    return new TubeGeometry(new CatmullRomCurve3(points), 32, 0.006, 6, false);
  }, []);
  const string = useMemo(() => {
    const geometry = new BufferGeometry().setFromPoints([new Vector3(), new Vector3(), new Vector3()]);
    const material = new LineBasicMaterial({
      color: new Color("#f7fff0").multiplyScalar(1.5),
      transparent: true,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    return new Line(geometry, material);
  }, []);
  useEffect(
    () => () => {
      bowGeometry.dispose();
      string.geometry.dispose();
      (string.material as LineBasicMaterial).dispose();
    },
    [bowGeometry, string],
  );

  useFrame(({ clock }, delta) => {
    const group = root.current;
    const { left, right, hips } = hands;
    if (!group || !left || !right || !hips) return;
    const t = age(clock.elapsedTime);
    presence.current += ((active.current ? 1 : 0) - presence.current) * Math.min(1, delta * FADE_RATE);
    const fade = presence.current;

    left.getWorldPosition(scratch.left);
    right.getWorldPosition(scratch.right);
    hips.getWorldPosition(scratch.hips);
    // She aims from her drawing hand through the bow hand.
    scratch.aim.subVectors(scratch.left, scratch.right).normalize();
    scratch.side.crossVectors(scratch.aim, UP).normalize();
    scratch.up.crossVectors(scratch.side, scratch.aim).normalize();

    // The bow, in her left hand from the draw on; its string pulled to the right hand until released.
    const drawn = t >= beats.drawSeconds && t < beats.releaseSeconds;
    const shown = Math.min(1, Math.max(0, (t - beats.drawSeconds) / BOW_APPEAR)) * fade;
    if (bow.current) {
      bow.current.visible = shown > 0.01;
      scratch.basis.makeBasis(scratch.aim, scratch.up, scratch.side);
      scratch.quaternion.setFromRotationMatrix(scratch.basis);
      placeInWorld(bow.current, group, scratch.left, size * (0.6 + 0.4 * shown), scratch.quaternion);
    }
    bowMaterial.setValues({ opacity: shown });
    const tip = (sign: number) =>
      scratch.point
        .copy(scratch.left)
        .addScaledVector(scratch.up, sign * BOW_HALF * size)
        .addScaledVector(scratch.aim, -BOW_BULGE * size);
    const top = tip(1).clone();
    const bottom = tip(-1).clone();
    // Drawn, the string meets at her right hand; loosed, it twangs back straight between the tips.
    const twang = Math.sin((t - beats.releaseSeconds) * 60) * Math.max(0, 1 - (t - beats.releaseSeconds) * 4) * 0.02;
    const nock = drawn
      ? scratch.right.clone()
      : top
          .clone()
          .lerp(bottom, 0.5)
          .addScaledVector(scratch.aim, t >= beats.releaseSeconds ? twang * size : 0);
    pullString(string, group, [top, nock, bottom], shown);

    // The nocked arrow, brightening as she holds the draw.
    if (nocked.current) {
      nocked.current.visible = drawn && shown > 0.5;
      const along = scratch.aim.clone().multiplyScalar(ARROW_LENGTH * ARROW_SCALE * size * 0.5);
      scratch.quaternion.setFromUnitVectors(UP, scratch.aim);
      placeInWorld(nocked.current, group, scratch.right.clone().add(along), size * ARROW_SCALE, scratch.quaternion);
    }
    const hold = Math.min(1, Math.max(0, (t - beats.drawSeconds) / (beats.releaseSeconds - beats.drawSeconds)));
    arrows.fade((0.4 + 0.6 * hold) * fade);

    // Loosed: off the way she aims, then curling up into the sky above her.
    if (t >= beats.releaseSeconds && !shot.current) {
      const from = scratch.right.clone();
      const aim = scratch.aim.clone();
      const over = scratch.hips.clone().addScaledVector(UP, size * 2.6);
      const curve = new CubicBezierCurve3(
        from,
        from.clone().addScaledVector(aim, size * 0.9),
        from
          .clone()
          .addScaledVector(aim, size * 0.7)
          .addScaledVector(UP, size * 1.6),
        over,
      );
      shot.current = { from, aim, curve };
      trailPoints.current = [];
    }
    const flight = shot.current ? (t - beats.releaseSeconds) / FLIGHT_SECONDS : -1;
    if (flying.current) {
      flying.current.visible = flight >= 0 && flight < 1;
      if (shot.current && flying.current.visible) {
        const eased = 1 - (1 - flight) ** 1.6;
        const at = shot.current.curve.getPointAt(Math.min(1, eased));
        const heading = shot.current.curve.getTangentAt(Math.min(1, eased)).normalize();
        scratch.quaternion.setFromUnitVectors(UP, heading);
        placeInWorld(flying.current, group, at, size * ARROW_SCALE, scratch.quaternion);
        trailPoints.current.unshift(at.clone());
        if (trailPoints.current.length > TRAIL_POINTS) trailPoints.current.pop();
      }
    }
    if (trail.current) {
      const points = trailPoints.current;
      trail.current.visible = points.length > 2 && flight < 1.4;
      if (trail.current.visible) {
        retrace(trail.current, group, points, (0.012 * size) / (group.getWorldScale(scratch.point).x || 1));
      }
      trailMaterial.setValues({ opacity: Math.max(0, 1 - Math.max(0, flight - 0.8) * 2) * 0.8 });
    }

    // The burst high above her, then the ring of arrows raining down round her.
    const sinceBurst = t - beats.releaseSeconds - FLIGHT_SECONDS;
    if (burst.current && shot.current) {
      const spread = Math.min(1, Math.max(0, sinceBurst / BURST_SECONDS));
      burst.current.visible = sinceBurst >= 0 && spread < 1;
      scratch.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
      placeInWorld(
        burst.current,
        group,
        shot.current.curve.getPointAt(1),
        size * (0.15 + spread * 0.7),
        scratch.quaternion,
      );
      burstMaterial.setValues({ opacity: 1 - spread });
    }
    // The ring outlasts the intro: it stays stuck round her a while, then fades on its own.
    const ringFade = 1 - Math.min(1, Math.max(0, (sinceBurst - RING_HOLD) / RING_FADE));
    ringArrows.fade(ringFade);
    ring.current.forEach((arrow, index) => {
      if (!arrow) return;
      const start = sinceBurst - 0.1 - index * RAIN_STAGGER;
      arrow.visible = start >= 0 && ringFade > 0.01;
      if (!arrow.visible) return;
      const drop = Math.min(1, start / RAIN_SECONDS) ** 2;
      const angle = (index / RING_ARROWS) * Math.PI * 2;
      // The figure stands on the pedestal: its origin is at its feet.
      const floor = group.getWorldPosition(scratch.side).y;
      scratch.point.set(
        scratch.hips.x + Math.cos(angle) * RING_RADIUS * size,
        floor + ARROW_LENGTH * ARROW_SCALE * size * 0.3 + RAIN_HEIGHT * size * (1 - drop),
        scratch.hips.z + Math.sin(angle) * RING_RADIUS * size,
      );
      // Point down, leaning a little outwards, as if it fell from above her.
      scratch.quaternion
        .copy(scratch.down)
        .premultiply(new Quaternion().setFromAxisAngle(new Vector3(-Math.sin(angle), 0, Math.cos(angle)), -0.2));
      placeInWorld(arrow, group, scratch.point, size * ARROW_SCALE, scratch.quaternion);
    });
  });

  return (
    <group ref={root}>
      <group ref={bow} visible={false}>
        <mesh geometry={bowGeometry} material={bowMaterial} />
      </group>
      <primitive object={string} />
      <group ref={nocked} visible={false}>
        <LightArrow materials={arrows} />
      </group>
      <group ref={flying} visible={false}>
        <LightArrow materials={arrows} />
      </group>
      <mesh ref={trail} material={trailMaterial} visible={false} />
      <mesh ref={burst} material={burstMaterial} visible={false}>
        <ringGeometry args={[0.8, 1, 48]} />
      </mesh>
      {Array.from({ length: RING_ARROWS }, (_, index) => (
        <group
          key={index}
          ref={(group) => {
            ring.current[index] = group;
          }}
          visible={false}
        >
          <LightArrow materials={ringArrows} />
        </group>
      ))}
    </group>
  );
}

/** Lays the bowstring through `points` (world space: top tip, nock, bottom tip), at `opacity`. */
function pullString(string: Line, group: Object3D, points: readonly Vector3[], opacity: number) {
  const positions = string.geometry.attributes.position;
  points.forEach((point, index) => {
    const local = group.worldToLocal(point.clone());
    positions.setXYZ(index, local.x, local.y, local.z);
  });
  positions.needsUpdate = true;
  (string.material as LineBasicMaterial).opacity = opacity;
}

/** Swaps the trail's tube for one through `points` (world space), `radius` thick in `group`'s units. */
function retrace(trail: Mesh, group: Object3D, points: readonly Vector3[], radius: number) {
  trail.geometry.dispose();
  trail.geometry = new TubeGeometry(
    new CatmullRomCurve3(points.map((point) => group.worldToLocal(point.clone()))),
    points.length * 2,
    radius,
    6,
    false,
  );
}
