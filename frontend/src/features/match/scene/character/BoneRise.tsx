"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  AdditiveBlending,
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Group,
  type Object3D,
} from "three";
import type { IntroBoneBeats } from "../../characters";
import { useAge } from "../useAge";
import { findBone, placeInWorld } from "./worldPlacement";

/** Skeletal hands clawing out of the ground round him, and how far out (shares of his height). */
const HANDS = 5;
const HAND_RADIUS = 0.46;
/** Loose bones whirling up round him, and skulls hanging round his head. */
const BONES = 10;
const SKULLS = 5;
const SKULL_RADIUS = 0.36;
const SKULL_HEIGHT = 0.92;
/** Turns per second of the whirl, and how long the skulls take to burst once his arms come down. */
const WHIRL = 0.18;
const BURST_SECONDS = 0.45;
/** Per second: how fast it all fades once the intro is over. */
const FADE_RATE = 2.5;

const scratch = { centre: new Vector3(), point: new Vector3(), facing: new Quaternion() };
const UP = new Vector3(0, 1, 0);

/**
 * The Necromancer's intro: as his arms rise, a ring of runes wakes on the ground, skeletal hands
 * claw up out of it and loose bones whirl up round him; skulls with burning teal eyes come to
 * hang round his head while he holds his arms up, and burst into soul fire as he lowers them.
 * Everything fades once the intro is over (`active` false). Placed in world space round his
 * hips, on the floor he stands on. Mounted fresh with every intro.
 */
export function BoneRise({
  figure,
  size,
  color,
  beats,
  active,
}: {
  figure: Object3D;
  size: number;
  color: string;
  beats: IntroBoneBeats;
  active: RefObject<boolean>;
}) {
  const root = useRef<Group>(null);
  const runes = useRef<Group>(null);
  const hands = useRef<(Group | null)[]>([]);
  const bones = useRef<(Group | null)[]>([]);
  const skulls = useRef<(Group | null)[]>([]);
  const flames = useRef<(Group | null)[]>([]);
  const hips = useMemo(() => findBone(figure, "Hips"), [figure]);
  const glow = useMemo(() => new Color(color).multiplyScalar(2.2), [color]);
  const { bone, soul, rune } = useMemo(
    () => ({
      bone: new MeshStandardMaterial({ color: "#e9e2cc", roughness: 0.7, transparent: true }),
      soul: new MeshBasicMaterial({ color: glow, transparent: true, blending: AdditiveBlending, toneMapped: false }),
      rune: new MeshBasicMaterial({
        color: glow,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [glow],
  );
  useEffect(() => () => [bone, soul, rune].forEach((material) => material.dispose()), [bone, soul, rune]);
  const age = useAge();
  const presence = useRef(0);

  useFrame(({ clock }, delta) => {
    const group = root.current;
    if (!group || !hips) return;
    const t = age(clock.elapsedTime);
    presence.current += ((active.current ? 1 : 0) - presence.current) * Math.min(1, delta * FADE_RATE);
    const fade = presence.current;
    const ramp = (from: number, to: number) => Math.min(1, Math.max(0, (t - from) / (to - from)));
    const waking = ramp(beats.raiseSeconds, beats.peakSeconds);
    const burst = ramp(beats.releaseSeconds, beats.releaseSeconds + BURST_SECONDS);

    // Round his hips, on the floor he stands on (the figure's origin is at its feet).
    hips.getWorldPosition(scratch.centre);
    scratch.centre.y = group.getWorldPosition(scratch.point).y;

    if (runes.current) {
      placeInWorld(runes.current, group, scratch.centre, size);
      runes.current.rotation.y += delta * 0.4;
    }
    rune.setValues({ opacity: waking * fade * (0.7 + 0.3 * Math.sin(t * 5)) });
    bone.setValues({ opacity: fade });
    soul.setValues({ opacity: fade });

    // Hands claw up out of the ground as he raises his arms, and sink back once the skulls burst.
    hands.current.forEach((hand, index) => {
      if (!hand) return;
      const angle = (index / HANDS) * Math.PI * 2 + 0.3;
      const rise = ramp(beats.raiseSeconds + index * 0.08, beats.peakSeconds) * (1 - burst * 0.9);
      hand.visible = rise > 0.01 && fade > 0.01;
      scratch.point.set(
        scratch.centre.x + Math.cos(angle) * HAND_RADIUS * size,
        scratch.centre.y - (1 - rise) * 0.25 * size,
        scratch.centre.z + Math.sin(angle) * HAND_RADIUS * size,
      );
      // Palms turned in towards him, clutching at the air.
      scratch.facing.setFromAxisAngle(UP, -angle - Math.PI / 2);
      placeInWorld(hand, group, scratch.point, size, scratch.facing);
      hand.rotateZ(Math.sin(t * 3 + index) * 0.15);
    });

    // Bones whirl up from the ground to his waist, then circle there until the burst scatters them.
    bones.current.forEach((piece, index) => {
      if (!piece) return;
      const climb = ramp(beats.raiseSeconds + index * 0.05, beats.peakSeconds + 0.3);
      piece.visible = climb > 0.01 && burst < 1 && fade > 0.01;
      const angle = (index / BONES) * Math.PI * 2 + t * WHIRL * Math.PI * 2;
      const radius = (0.3 + 0.08 * Math.sin(index * 2.3)) * size * (1 + burst * 1.5);
      scratch.point.set(
        scratch.centre.x + Math.cos(angle) * radius,
        scratch.centre.y + (0.08 + 0.5 * climb + 0.05 * Math.sin(t * 2 + index)) * size - burst * 0.3 * size,
        scratch.centre.z + Math.sin(angle) * radius,
      );
      placeInWorld(piece, group, scratch.point, size);
      piece.rotation.set(t * 2 + index, t * 1.3 + index * 0.7, index);
    });

    // Skulls rise to hang round his head, eyes burning, and burst into soul fire as his arms fall.
    skulls.current.forEach((skull, index) => {
      if (!skull) return;
      const rise = ramp(beats.raiseSeconds + 0.3 + index * 0.1, beats.peakSeconds + 0.2);
      skull.visible = rise > 0.01 && burst < 0.5 && fade > 0.01;
      const angle = (index / SKULLS) * Math.PI * 2 - t * WHIRL * Math.PI;
      scratch.point.set(
        scratch.centre.x + Math.cos(angle) * SKULL_RADIUS * size,
        scratch.centre.y +
          (0.25 + (SKULL_HEIGHT - 0.25) * (1 - (1 - rise) ** 3)) * size +
          Math.sin(t * 2.2 + index) * 0.02 * size,
        scratch.centre.z + Math.sin(angle) * SKULL_RADIUS * size,
      );
      // Facing out, away from him.
      scratch.facing.setFromAxisAngle(UP, -angle + Math.PI / 2);
      placeInWorld(skull, group, scratch.point, size * (1 + burst * 0.6), scratch.facing);

      const flame = flames.current[index];
      if (flame) {
        flame.visible = burst > 0 && burst < 1 && fade > 0.01;
        placeInWorld(flame, group, scratch.point, size * (0.05 + burst * 0.18));
      }
    });
  });

  return (
    <group ref={root}>
      <group ref={runes}>
        <RuneRing material={rune} />
      </group>
      {Array.from({ length: HANDS }, (_, index) => (
        <group
          key={`hand${index}`}
          ref={(group) => {
            hands.current[index] = group;
          }}
          visible={false}
        >
          <SkeletalHand material={bone} />
        </group>
      ))}
      {Array.from({ length: BONES }, (_, index) => (
        <group
          key={`bone${index}`}
          ref={(group) => {
            bones.current[index] = group;
          }}
          visible={false}
        >
          <LooseBone material={bone} />
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
          <Skull bone={bone} eyes={soul} />
        </group>
      ))}
      {Array.from({ length: SKULLS }, (_, index) => (
        <group
          key={`flame${index}`}
          ref={(group) => {
            flames.current[index] = group;
          }}
          visible={false}
        >
          <mesh material={soul}>
            <sphereGeometry args={[1, 16, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The ring of runes on the ground, in units of his height: two rings and eight marks between them. */
function RuneRing({ material }: { material: MeshBasicMaterial }) {
  return (
    <group rotation-x={-Math.PI / 2} position-y={0.004}>
      <mesh material={material}>
        <ringGeometry args={[0.52, 0.55, 64]} />
      </mesh>
      <mesh material={material}>
        <ringGeometry args={[0.38, 0.4, 64]} />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => (
        <mesh
          key={index}
          material={material}
          rotation-z={(index * Math.PI) / 4}
          position={[Math.cos((index * Math.PI) / 4) * 0.465, Math.sin((index * Math.PI) / 4) * 0.465, 0]}
        >
          <planeGeometry args={[0.1, 0.018]} />
        </mesh>
      ))}
    </group>
  );
}

/** A skeletal hand reaching up, in units of his height: forearm, palm and four curled fingers and a thumb. */
function SkeletalHand({ material }: { material: MeshStandardMaterial }) {
  return (
    <group>
      <mesh material={material} position-y={0.08}>
        <cylinderGeometry args={[0.012, 0.016, 0.16, 6]} />
      </mesh>
      <mesh material={material} position-y={0.18}>
        <boxGeometry args={[0.07, 0.06, 0.02]} />
      </mesh>
      {[-0.026, -0.009, 0.009, 0.026].map((x, index) => (
        <group key={x} position={[x, 0.21, 0]} rotation-x={0.5 + index * 0.08}>
          <mesh material={material} position-y={0.025}>
            <cylinderGeometry args={[0.006, 0.007, 0.05, 5]} />
          </mesh>
          <group position-y={0.05} rotation-x={0.7}>
            <mesh material={material} position-y={0.02}>
              <cylinderGeometry args={[0.005, 0.006, 0.04, 5]} />
            </mesh>
          </group>
        </group>
      ))}
      <group position={[0.045, 0.17, 0]} rotation-z={-0.8}>
        <mesh material={material} position-y={0.02}>
          <cylinderGeometry args={[0.006, 0.007, 0.045, 5]} />
        </mesh>
      </group>
    </group>
  );
}

/** A loose long bone, in units of his height: a shaft with knobbed ends. */
function LooseBone({ material }: { material: MeshStandardMaterial }) {
  return (
    <group>
      <mesh material={material}>
        <cylinderGeometry args={[0.01, 0.01, 0.13, 6]} />
      </mesh>
      {[1, -1].map((end) =>
        [-0.012, 0.012].map((x) => (
          <mesh key={`${end}:${x}`} material={material} position={[x, end * 0.068, 0]}>
            <sphereGeometry args={[0.014, 8, 6]} />
          </mesh>
        )),
      )}
    </group>
  );
}

/** A skull facing +Z, in units of his height: a cranium, a jaw and two glowing eyes. */
function Skull({ bone, eyes }: { bone: MeshStandardMaterial; eyes: MeshBasicMaterial }) {
  return (
    <group>
      <mesh material={bone} scale={[1, 1.05, 1.1]}>
        <sphereGeometry args={[0.045, 16, 12]} />
      </mesh>
      <mesh material={bone} position={[0, -0.04, 0.018]}>
        <boxGeometry args={[0.05, 0.022, 0.04]} />
      </mesh>
      {[-0.017, 0.017].map((x) => (
        <mesh key={x} material={eyes} position={[x, 0.002, 0.042]}>
          <sphereGeometry args={[0.011, 8, 6]} />
        </mesh>
      ))}
    </group>
  );
}
