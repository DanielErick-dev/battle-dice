"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  AdditiveBlending,
  Color,
  MeshBasicMaterial,
  Plane,
  Quaternion,
  Vector3,
  type Group,
  type Object3D,
} from "three";
import type { IntroBoneBeats } from "../../characters";
import { useAge } from "../useAge";
import { useSoftDisc } from "./softDisc";
import { fadingMaterial, preloadProps, Prop, propPoint, usePropMesh } from "./props";
import { findBone, placeInWorld } from "./worldPlacement";

/** Skeletal hands clawing out of the ground round him: how many, how far out and how tall (shares of his height). */
const HANDS = 5;
const HAND_RADIUS = 0.46;
const HAND_LENGTH = 0.3;
/** Seconds between one hand starting to climb and the next, and how long each takes to come out. */
const HAND_STAGGER = 0.4;
const HAND_CLIMB_SECONDS = 2.6;
/** Skulls hanging round his head, and their size. */
const SKULLS = 5;
const SKULL_RADIUS = 0.36;
const SKULL_HEIGHT = 0.92;
const SKULL_SIZE = 0.13;
const SKULL_RISE_SECONDS = 2.4;
/** Skeletons climbing out of the ground behind him, on either side: where they stand, how tall, when they start. */
const SKELETONS = [
  { x: -0.5, z: -0.38, turn: 0.45, start: 0.4 },
  { x: 0.5, z: -0.38, turn: -0.45, start: 0.8 },
];
const SKELETON_HEIGHT = 0.82;
const SKELETON_CLIMB_SECONDS = 4;
/** Heaves a climbing skeleton pauses between. */
const HEAVES = 3;
/** Turns per second of the skulls' orbit, and how long they take to dissolve once his arms come down. */
const WHIRL = 0.12;
const DISSOLVE_SECONDS = 2.2;
/** Seconds the skulls keep hanging round him after his arms come down, before they start to dissolve. */
const SKULL_LINGER_SECONDS = 1;
/** Per second: how fast it all sinks back and fades once the intro is over. */
const FADE_RATE = 0.6;
/** Sickly pale green: the dead's eyes and the smoke they leave. Kept dim; this is a grave, not a party. */
const SOUL_FIRE = new Color("#9fc98a");
const GRAVE_SMOKE = "#141a12";
/** Share of their own colour the bones keep, aged and in the gloom. */
const BONE_SHADE = 0.6;

const scratch = { centre: new Vector3(), point: new Vector3(), facing: new Quaternion() };
const UP = new Vector3(0, 1, 0);

const smooth = (x: number) => x * x * (3 - 2 * x);
/** Climbs 0 → 1 in `HEAVES` heaves, nearly stopping between them, like something dragging itself up. */
const heave = (x: number) => x - Math.sin(x * Math.PI * 2 * HEAVES) / (Math.PI * 2 * HEAVES);

preloadProps(["skull", "skeletalHand", "skeleton"]);

/**
 * The Necromancer's intro: as his arms rise, a shadow spreads over the ground, skeletal hands
 * slowly claw their way out of it and two skeletons drag themselves out of the earth behind him;
 * skulls with dim, sickly eyes rise to hang round his head while he holds his arms up, and
 * dissolve into grave smoke as he lowers them. Once the intro is over (`active` false) the dead
 * sink back into the ground and it all fades. Placed in world space round his hips, on the
 * floor he stands on; the hands and skeletons are cut at the floor, so they seem to come out of
 * it (the canvas needs `localClippingEnabled`). Mounted fresh with every intro.
 */
export function BoneRise({
  figure,
  size,
  beats,
  active,
}: {
  figure: Object3D;
  size: number;
  beats: IntroBoneBeats;
  active: RefObject<boolean>;
}) {
  const root = useRef<Group>(null);
  const shadow = useRef<Group>(null);
  const hands = useRef<(Group | null)[]>([]);
  const skeletons = useRef<(Group | null)[]>([]);
  const skulls = useRef<(Group | null)[]>([]);
  const smokes = useRef<(Group | null)[]>([]);
  const hips = useMemo(() => findBone(figure, "Hips"), [figure]);
  const skull = usePropMesh("skull");
  const hand = usePropMesh("skeletalHand");
  const skeleton = usePropMesh("skeleton");
  const floor = useMemo(() => new Plane(UP.clone(), 0), []);
  const pool = useSoftDisc();
  const materials = useMemo(
    () => ({
      skull: fadingMaterial(skull.material, BONE_SHADE),
      hand: Object.assign(fadingMaterial(hand.material, BONE_SHADE), { clippingPlanes: [floor] }),
      skeleton: Object.assign(fadingMaterial(skeleton.material, BONE_SHADE), { clippingPlanes: [floor] }),
      eyes: new MeshBasicMaterial({
        color: SOUL_FIRE,
        transparent: true,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      smoke: new MeshBasicMaterial({ color: GRAVE_SMOKE, transparent: true, depthWrite: false }),
      shadow: new MeshBasicMaterial({ color: "#000", map: pool, transparent: true, depthWrite: false }),
    }),
    [skull.material, hand.material, skeleton.material, floor, pool],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const age = useAge();
  const presence = useRef(0);

  useFrame(({ clock }, delta) => {
    const group = root.current;
    if (!group || !hips) return;
    const t = age(clock.elapsedTime);
    presence.current += ((active.current ? 1 : 0) - presence.current) * Math.min(1, delta * FADE_RATE);
    const fade = presence.current;
    const ramp = (from: number, seconds: number) => Math.min(1, Math.max(0, (t - from) / seconds));
    const dissolve = smooth(ramp(beats.releaseSeconds + SKULL_LINGER_SECONDS, DISSOLVE_SECONDS));

    // Round his hips, on the floor he stands on (the figure's origin is at its feet).
    hips.getWorldPosition(scratch.centre);
    scratch.centre.y = group.getWorldPosition(scratch.point).y;
    floor.set(UP, -scratch.centre.y);

    if (shadow.current) {
      placeInWorld(shadow.current, group, scratch.centre, size * (0.6 + 0.6 * smooth(ramp(0, beats.peakSeconds))));
    }
    materials.shadow.setValues({ opacity: 0.9 * smooth(ramp(0, beats.raiseSeconds + 0.6)) * fade });
    for (const material of [materials.hand, materials.skeleton]) {
      material.setValues({ opacity: Math.min(1, fade * 1.5) });
    }
    // The eyes gutter like dying embers.
    materials.eyes.setValues({
      opacity: Math.min(1, fade * 1.5) * (0.55 + 0.25 * Math.sin(t * 7) + 0.2 * Math.sin(t * 17.3)),
    });
    materials.skull.setValues({ opacity: Math.min(1, fade * 1.5) * (1 - dissolve) });

    // Hands claw their way out one after another, trembling, and sink back once the intro is over.
    hands.current.forEach((piece, index) => {
      if (!piece) return;
      const angle = (index / HANDS) * Math.PI * 2 + 0.3;
      const out = smooth(ramp(beats.raiseSeconds + index * HAND_STAGGER, HAND_CLIMB_SECONDS)) * fade;
      piece.visible = out > 0.01;
      scratch.point.set(
        scratch.centre.x + Math.cos(angle) * HAND_RADIUS * size,
        scratch.centre.y - (1 - out) * HAND_LENGTH * size,
        scratch.centre.z + Math.sin(angle) * HAND_RADIUS * size,
      );
      // Palms turned in towards him, clutching at the air.
      scratch.facing.setFromAxisAngle(UP, -angle - Math.PI / 2);
      placeInWorld(piece, group, scratch.point, size, scratch.facing);
      piece.rotateX(-0.25 + Math.sin(t * 1.4 + index) * 0.1);
      piece.rotateZ(Math.sin(t * 1.1 + index * 1.7) * 0.12 + Math.sin(t * 23 + index) * 0.012 * out);
    });

    // Two skeletons drag themselves out of the earth behind him, heave by heave, leaning forward.
    skeletons.current.forEach((piece, index) => {
      if (!piece) return;
      const { x, z, turn, start } = SKELETONS[index];
      const climb = heave(ramp(beats.raiseSeconds + start, SKELETON_CLIMB_SECONDS));
      const out = climb * fade;
      piece.visible = out > 0.01;
      scratch.point.set(
        scratch.centre.x + x * size,
        scratch.centre.y - (1 - out) * SKELETON_HEIGHT * size,
        scratch.centre.z + z * size,
      );
      scratch.facing.setFromAxisAngle(UP, turn + Math.sin(t * 0.9 + index * 2) * 0.1);
      placeInWorld(piece, group, scratch.point, size, scratch.facing);
      piece.rotateX(0.3 * (1 - climb) + Math.sin(t * 1.3 + index) * 0.03);
    });

    // Skulls rise slowly to hang round his head, and dissolve into grave smoke as his arms fall.
    skulls.current.forEach((piece, index) => {
      if (!piece) return;
      const rise = smooth(ramp(beats.raiseSeconds + 0.4 + index * 0.2, SKULL_RISE_SECONDS));
      piece.visible = rise > 0.01 && dissolve < 0.85 && fade > 0.01;
      const angle = (index / SKULLS) * Math.PI * 2 - t * WHIRL * Math.PI;
      scratch.point.set(
        scratch.centre.x + Math.cos(angle) * SKULL_RADIUS * size,
        scratch.centre.y + (0.2 + (SKULL_HEIGHT - 0.2) * rise) * size + Math.sin(t * 1.5 + index) * 0.015 * size,
        scratch.centre.z + Math.sin(angle) * SKULL_RADIUS * size,
      );
      // Facing out, away from him, the jaw slowly working.
      scratch.facing.setFromAxisAngle(UP, -angle + Math.PI / 2);
      placeInWorld(piece, group, scratch.point, size * (1 - dissolve * 0.3), scratch.facing);
      piece.rotateX(Math.max(0, Math.sin(t * 5 + index * 2)) * 0.1);

      const smoke = smokes.current[index];
      if (smoke) {
        smoke.visible = dissolve > 0 && dissolve < 1 && fade > 0.01;
        placeInWorld(
          smoke,
          group,
          scratch.point.setY(scratch.point.y + dissolve * 0.08 * size),
          size * (0.05 + dissolve * 0.1),
        );
      }
    });
    materials.smoke.setValues({ opacity: 0.7 * Math.sin(dissolve * Math.PI) * fade });
  });

  return (
    <group ref={root}>
      <group ref={shadow}>
        <mesh material={materials.shadow} rotation-x={-Math.PI / 2} position-y={0.003} renderOrder={1}>
          <circleGeometry args={[0.6, 48]} />
        </mesh>
      </group>
      {Array.from({ length: HANDS }, (_, index) => (
        <group
          key={`hand${index}`}
          ref={(group) => {
            hands.current[index] = group;
          }}
          visible={false}
        >
          <Prop geometry={hand.geometry} material={materials.hand} height={HAND_LENGTH} standing />
        </group>
      ))}
      {SKELETONS.map((_, index) => (
        <group
          key={`skeleton${index}`}
          ref={(group) => {
            skeletons.current[index] = group;
          }}
          visible={false}
        >
          <Prop geometry={skeleton.geometry} material={materials.skeleton} height={SKELETON_HEIGHT} standing />
        </group>
      ))}
      {Array.from({ length: SKULLS }, (_, index) => (
        <group
          key={`skull${index}`}
          ref={(group) => {
            skulls.current[index] = group;
          }}
          visible={false}
        >
          <Prop geometry={skull.geometry} material={materials.skull} height={SKULL_SIZE} />
          {[-0.3, 0.3].map((x) => (
            <mesh key={x} material={materials.eyes} position={propPoint(SKULL_SIZE, [x, 0.05, 0.55])}>
              <sphereGeometry args={[(0.12 * SKULL_SIZE) / 1.9, 10, 8]} />
            </mesh>
          ))}
        </group>
      ))}
      {Array.from({ length: SKULLS }, (_, index) => (
        <group
          key={`smoke${index}`}
          ref={(group) => {
            smokes.current[index] = group;
          }}
          visible={false}
        >
          <mesh material={materials.smoke}>
            <sphereGeometry args={[1, 16, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
