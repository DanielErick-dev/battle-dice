"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Euler, Quaternion, Vector3, type Group } from "three";
import { PIPS } from "../diceFaces";
import { TILE_HEIGHT, type Vec3 } from "./boardLayout";

const SIZE = 0.8;
const HALF = SIZE / 2;
const PIP_SPACING = SIZE * 0.27;
const REST_Y = TILE_HEIGHT / 2 + HALF;
/** Where the die is released, relative to its landing spot (towards the camera, to the left). */
const THROW_FROM = new Vector3(-2.4, 2.4, 2.2);
/** A drop, then bounces losing height; durations in seconds. */
const BOUNCES = [
  { duration: 0.42, height: 0 },
  { duration: 0.36, height: 0.55 },
  { duration: 0.22, height: 0.18 },
  { duration: 0.12, height: 0.05 },
] as const;
/** Hop height that would hit as hard as the initial drop, to scale impact strength. */
const DROP_HEIGHT_EQUIVALENT = 0.8;
const THROW_SECONDS = BOUNCES.reduce((sum, bounce) => sum + bounce.duration, 0);
/** How long the die rests showing its value before shrinking away. */
const REST_SECONDS = 2.2;
const VANISH_SECONDS = 0.3;
const UP = new Vector3(0, 1, 0);

/** Standard die: opposite faces add up to 7. `u`/`v` orient the pip grid on the face. */
export const FACES: Record<number, { normal: Vector3; u: Vector3; v: Vector3 }> = {
  1: { normal: new Vector3(0, 1, 0), u: new Vector3(1, 0, 0), v: new Vector3(0, 0, -1) },
  6: { normal: new Vector3(0, -1, 0), u: new Vector3(1, 0, 0), v: new Vector3(0, 0, 1) },
  2: { normal: new Vector3(1, 0, 0), u: new Vector3(0, 0, -1), v: new Vector3(0, 1, 0) },
  5: { normal: new Vector3(-1, 0, 0), u: new Vector3(0, 0, 1), v: new Vector3(0, 1, 0) },
  3: { normal: new Vector3(0, 0, 1), u: new Vector3(1, 0, 0), v: new Vector3(0, 1, 0) },
  4: { normal: new Vector3(0, 0, -1), u: new Vector3(-1, 0, 0), v: new Vector3(0, 1, 0) },
};

const PIP_MESHES = Object.entries(FACES).flatMap(([value, { normal, u, v }]) =>
  PIPS[Number(value)].map((cell) => {
    const column = (cell % 3) - 1;
    const row = Math.floor(cell / 3) - 1;
    const position = normal
      .clone()
      .multiplyScalar(HALF + 0.002)
      .addScaledVector(u, column * PIP_SPACING)
      .addScaledVector(v, -row * PIP_SPACING);
    const rotation = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal));
    return { key: `${value}:${cell}`, position: position.toArray(), rotation, red: value === "1" };
  }),
);

interface Throw {
  id: number;
  startedAt: number;
  from: Vector3;
  to: Vector3;
  startRotation: Quaternion;
  spinAxis: Vector3;
  spinTurns: number;
  finalRotation: Quaternion;
  bounce: number;
}

interface DiceThrowProps {
  roll: { id: number; value: number } | null;
  /** Where the die comes to rest (on the ground under it). */
  landing: Vec3;
  /** Called on each impact with its strength, 1 for the first. */
  onImpact: (strength: number) => void;
}

/**
 * A die tossed onto the arena for every roll: it drops, bounces a few times losing energy,
 * tumbles, and settles on the rolled value, then vanishes. Animated, not simulated, so it
 * always lands on the value the game engine decided.
 */
export function DiceThrow({ roll, landing, onImpact }: DiceThrowProps) {
  const group = useRef<Group>(null);
  const current = useRef<Throw | null>(null);
  const scratch = useRef({ spin: new Quaternion(), turn: new Quaternion(), position: new Vector3() });

  useFrame(({ clock }) => {
    const node = group.current;
    if (!node) return;
    const now = clock.elapsedTime;

    if (roll && roll.id !== current.current?.id) current.current = startThrow(roll, landing, now);
    const active = current.current;
    if (!active) {
      node.visible = false;
      return;
    }

    const elapsed = now - active.startedAt;
    const progress = Math.min(1, elapsed / THROW_SECONDS);
    const { bounce, local } = bounceAt(elapsed);
    if (bounce > active.bounce) {
      active.bounce = bounce;
      // The drop hits hardest; each later impact scales with the hop that preceded it.
      onImpact(bounce === 1 ? 1 : BOUNCES[bounce - 1].height / DROP_HEIGHT_EQUIVALENT);
    }

    const glide = 1 - (1 - progress) ** 3;
    const { position, spin, turn } = scratch.current;
    position.lerpVectors(active.from, active.to, glide);
    position.y = active.to.y + heightAt(bounce, local, active.from.y - active.to.y);

    turn.setFromAxisAngle(active.spinAxis, active.spinTurns * Math.PI * 2 * glide);
    spin.copy(active.startRotation).multiply(turn);
    node.quaternion.slerpQuaternions(spin, active.finalRotation, smoothstep(0.55, 1, progress));
    node.position.copy(position);

    const vanish = Math.min(1, Math.max(0, (elapsed - THROW_SECONDS - REST_SECONDS) / VANISH_SECONDS));
    node.scale.setScalar(1 - vanish);
    node.visible = vanish < 1;
  });

  return (
    <group ref={group} visible={false}>
      <RoundedBox args={[SIZE, SIZE, SIZE]} radius={0.09} smoothness={4} castShadow>
        <meshStandardMaterial color="#f5f1e8" roughness={0.35} metalness={0.05} />
      </RoundedBox>
      {PIP_MESHES.map(({ key, position, rotation, red }) => (
        <mesh key={key} position={position} rotation={rotation}>
          <circleGeometry args={[SIZE * (red ? 0.12 : 0.085), 20]} />
          <meshStandardMaterial color={red ? "#c1121f" : "#18181b"} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function startThrow(roll: { id: number; value: number }, landing: Vec3, now: number): Throw {
  const to = new Vector3(landing[0], REST_Y, landing[2]);
  return {
    id: roll.id,
    startedAt: now,
    from: to.clone().add(THROW_FROM),
    to,
    startRotation: new Quaternion().setFromEuler(
      new Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2),
    ),
    spinAxis: new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
    spinTurns: 2 + Math.random() * 1.5,
    finalRotation: restingRotation(roll.value, Math.random() * Math.PI * 2),
    bounce: 0,
  };
}

/** Orientation that leaves `value` facing up, turned `yaw` radians around the vertical. */
export function restingRotation(value: number, yaw: number): Quaternion {
  const turn = new Quaternion().setFromAxisAngle(UP, yaw);
  return turn.multiply(new Quaternion().setFromUnitVectors(FACES[value].normal, UP));
}

/** Which bounce segment `elapsed` falls in (0 = the drop, past the end = resting) and how far into it. */
function bounceAt(elapsed: number): { bounce: number; local: number } {
  let start = 0;
  for (let i = 0; i < BOUNCES.length; i++) {
    const { duration } = BOUNCES[i];
    if (elapsed < start + duration) return { bounce: i, local: (elapsed - start) / duration };
    start += duration;
  }
  return { bounce: BOUNCES.length, local: 0 };
}

/** Height above the rest position: a falling drop first, then parabolic hops. */
function heightAt(bounce: number, local: number, dropHeight: number): number {
  if (bounce === 0) return dropHeight * (1 - local * local);
  if (bounce >= BOUNCES.length) return 0;
  return 4 * BOUNCES[bounce].height * local * (1 - local);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
