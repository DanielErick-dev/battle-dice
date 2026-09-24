"use client";

import { useFrame, type RootState } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3, type Group, type Mesh } from "three";
import type { DiceBoost, PlayerId } from "@/game/domain/types";
import { DEFAULT_TIMINGS, type PlayerSkin } from "../config";
import type { CardCastView } from "../model/matchView";
import { TILE_HEIGHT, TILE_PITCH, type Vec3 } from "./boardLayout";
import { DragonBallOrb, HealBurst, NimbusCloud, ShieldBubble } from "./CardEffects";
import { KiAura } from "./KiAura";
import type { SpriteAnchors } from "./spriteAnchors";

interface PlayerTokenProps {
  playerId: PlayerId;
  skin: PlayerSkin;
  target: Vec3;
  /** Next move is a portal/trap teleport: leap in an arc instead of running. */
  isTeleporting: boolean;
  isActive: boolean;
  /** Charged with ki: shows the aura. */
  isPowered: boolean;
  /** Ki Barrier up. */
  isShielded: boolean;
  /** Card modifier waiting for the next roll (Kaioken, Dragon Ball). */
  diceBoost: DiceBoost | null;
  /** Card this player just cast, for its one-shot effect. */
  cast: CardCastView | null;
  anchors: SpriteAnchors;
}

type Motion = "run" | "leap";
type Facing = "left" | "right";

interface Segment {
  from: Vector3;
  to: Vector3;
  motion: Motion;
  progress: number;
  duration: number;
}

/** World units per second while running: one tile per playback step, so steps chain seamlessly. */
const RUN_SPEED = TILE_PITCH / (DEFAULT_TIMINGS.stepMs / 1000);
/** Keeps the run cycle going this long after arriving, so brief stops between tiles don't flicker. */
const RUN_LINGER_SECONDS = 0.18;
const LEAP_SECONDS = 0.55;
const LEAP_SECONDS_PER_UNIT = 0.03;
/** Moves longer than this are never run, even without a teleport (e.g. restart). */
const MAX_RUN_DISTANCE = TILE_PITCH * 1.5;
const BASE_Y = TILE_HEIGHT / 2;
/** Sprite scale = SPRITE_DEPTH_SCALE / camera distance, so it shrinks with perspective. */
const SPRITE_DEPTH_SCALE = 16;
/** Screen-space pixels of horizontal travel needed before the sprite turns around. */
const TURN_THRESHOLD_PX = 2;

/**
 * Follows the target tile by tile. Targets queue up as waypoints so a multi-tile move
 * reads as one continuous run instead of a hop per tile.
 */
export function PlayerToken({
  playerId,
  skin,
  target,
  isTeleporting,
  isActive,
  isPowered,
  isShielded,
  diceBoost,
  cast,
  anchors,
}: PlayerTokenProps) {
  const group = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const waypoints = useRef<{ to: Vector3; teleport: boolean }[]>([]);
  const segment = useRef<Segment | null>(null);
  const lastTarget = useRef<string | null>(null);
  const facing = useRef<Facing>("right");
  const runLinger = useRef(0);
  const scratch = useRef({ a: new Vector3() });

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;

    const key = target.join(",");
    if (lastTarget.current === null) {
      node.position.set(target[0], BASE_Y, target[2]);
    } else if (lastTarget.current !== key) {
      waypoints.current.push({ to: new Vector3(target[0], BASE_Y, target[2]), teleport: isTeleporting });
    }
    lastTarget.current = key;

    if (!segment.current) segment.current = nextSegment(node.position, waypoints.current.shift());

    const current = segment.current;
    if (current) {
      if (current.progress === 0) facing.current = facingFor(current, state, facing.current);
      current.progress = Math.min(1, current.progress + delta / current.duration);

      if (current.motion === "run") {
        node.position.lerpVectors(current.from, current.to, current.progress);
      } else {
        const height = 1 + current.from.distanceTo(current.to) * 0.12;
        node.position.lerpVectors(current.from, current.to, easeInOut(current.progress));
        node.position.y = BASE_Y + Math.sin(Math.PI * current.progress) * height;
      }
      if (current.progress >= 1) segment.current = null;
    }

    if (ring.current) {
      ring.current.scale.setScalar(isActive ? 1 + Math.sin(state.clock.elapsedTime * 4) * 0.08 : 1);
    }

    const running = segment.current?.motion === "run";
    runLinger.current = running ? RUN_LINGER_SECONDS : Math.max(0, runLinger.current - delta);

    const sprite = anchors.get(playerId);
    if (sprite) {
      const motion = running || (runLinger.current > 0 && !segment.current) ? "run" : "idle";
      syncSprite(sprite, state, scratch.current.a.copy(node.position), motion, facing.current);
    }
  });

  return (
    <group ref={group}>
      <KiAura active={isPowered} />
      <KiAura active={diceBoost?.kind === "double"} palette="red" />
      {diceBoost?.kind === "fixed" && <DragonBallOrb />}
      {isShielded && <ShieldBubble />}
      {cast?.card.cardId === "flyingNimbus" && <NimbusCloud key={cast.id} />}
      {cast?.card.cardId === "senzuBean" && <HealBurst key={cast.id} />}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[0.42, 0.52, 40]} />
        <meshBasicMaterial color={skin.color} transparent opacity={isActive ? 0.9 : 0.35} toneMapped={false} />
      </mesh>

      {!skin.sprites && (
        <mesh position-y={0.55} castShadow>
          <capsuleGeometry args={[0.24, 0.5, 8, 16]} />
          <meshStandardMaterial color={skin.color} emissive={skin.color} emissiveIntensity={0.3} roughness={0.35} />
        </mesh>
      )}
    </group>
  );
}

function nextSegment(from: Vector3, waypoint: { to: Vector3; teleport: boolean } | undefined): Segment | null {
  if (!waypoint) return null;

  const distance = from.distanceTo(waypoint.to);
  const motion: Motion = waypoint.teleport || distance > MAX_RUN_DISTANCE ? "leap" : "run";
  return {
    from: from.clone(),
    to: waypoint.to,
    motion,
    progress: 0,
    duration:
      motion === "run"
        ? Math.max(distance / RUN_SPEED, 0.01)
        : LEAP_SECONDS + distance * LEAP_SECONDS_PER_UNIT,
  };
}

/** Faces the sprite along the segment's on-screen horizontal direction; vertical moves keep the last facing. */
function facingFor({ from, to }: Segment, { camera, size }: RootState, current: Facing): Facing {
  const a = from.clone().project(camera);
  const b = to.clone().project(camera);
  const dx = ((b.x - a.x) / 2) * size.width;
  if (Math.abs(dx) < TURN_THRESHOLD_PX) return current;
  return dx < 0 ? "left" : "right";
}

/** Places the DOM sprite over the token's feet, scaled by distance, and sets its animation state. */
function syncSprite(sprite: HTMLElement, { camera, size }: RootState, point: Vector3, motion: string, facing: Facing) {
  const scale = SPRITE_DEPTH_SCALE / camera.position.distanceTo(point);
  point.project(camera);
  const x = ((point.x + 1) / 2) * size.width;
  const y = ((1 - point.y) / 2) * size.height;
  sprite.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  sprite.style.opacity = point.z < 1 ? "1" : "0";
  if (sprite.dataset.motion !== motion) sprite.dataset.motion = motion;
  if (sprite.dataset.facing !== facing) sprite.dataset.facing = facing;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
