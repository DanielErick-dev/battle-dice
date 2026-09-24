"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type ComponentRef } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import type { TileEffectKind, TileEffectView } from "../model/matchView";
import type { BoardLayout, Vec3 } from "./boardLayout";

const BASE_DIRECTION = new Vector3(0, 12, 12.5).normalize();
const BASE_DISTANCE = Math.hypot(12, 12.5);
const BASE_FOV = 40;
/** Grid extent the base distance was tuned for (the 5×4 training board). */
const BASE_WIDTH = 10.8;
const BASE_DEPTH = 8.55;
/** Below this width/height ratio the camera backs off so the framed area stays in view. */
const FIT_ASPECT = 1.1;
/** How quickly the camera catches up with its goal (higher = snappier). */
const FOLLOW_RATE = 3;

/** How a tile effect is filmed: an optional close-up, a shake and/or a field-of-view kick. */
interface Shot {
  closeUp?: { distance: number; seconds: number };
  trauma?: number;
  fovKick?: number;
}

const SHOTS: Record<TileEffectKind, Shot> = {
  portal: { closeUp: { distance: 0.62, seconds: 1.5 } },
  advance: { closeUp: { distance: 0.78, seconds: 1.2 }, fovKick: 1 },
  trap: { trauma: 0.8 },
  skipTurn: { trauma: 0.3 },
  turnSkipped: { trauma: 0.2 },
  extraTurn: { fovKick: 0.6 },
};
/** Winner close-up (distance factor) while the camera circles them. */
const VICTORY_DISTANCE = 0.55;
const TRAUMA_DECAY = 1.4;
const SHAKE_AMPLITUDE = 0.45;
const FOV_KICK_DEGREES = 9;
const FOV_KICK_DECAY = 2.2;

/** How much bigger than the training board this layout is; scales camera, fog and stars. */
export function boardScaleFor(layout: BoardLayout): number {
  return Math.max(1, layout.width / BASE_WIDTH, layout.depth / BASE_DEPTH);
}

interface CameraRigProps {
  layout: BoardLayout;
  /** Where the action is (the moving or active player). */
  focus: Vec3;
  /** Track the focus up close instead of framing the whole board. */
  follow: boolean;
  /** Effect being shown; each new one gets its shot. */
  effect: TileEffectView | null;
  /** Someone won: close in on them and circle around. */
  celebrating: boolean;
}

/**
 * Orbit camera that glides to its goal (the whole board, or a close-up following the
 * focus) and films events: close-ups, shakes and field-of-view kicks. Panning moves camera
 * and target together, so the player's chosen orbit angle is kept.
 */
export function CameraRig({ layout, focus, follow, effect, celebrating }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / state.size.height);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const zooming = useRef(true);
  const lastGoalDistance = useRef(0);
  const lastEffect = useRef<TileEffectView | null>(null);
  const shot = useRef({ closeUpFactor: 1, closeUpUntil: 0, trauma: 0, fovKick: 0 });
  const appliedShake = useRef(new Vector3());
  const scratch = useRef({ goal: new Vector3(), offset: new Vector3(), step: new Vector3() });

  const aspectFit = Math.max(1, FIT_ASPECT / aspect);
  const overviewDistance = BASE_DISTANCE * boardScaleFor(layout) * aspectFit;
  const followDistance = BASE_DISTANCE * aspectFit;

  useEffect(() => {
    camera.position.copy(BASE_DIRECTION).multiplyScalar(overviewDistance);
    camera.lookAt(0, 0, 0);
    // Only on mount: later changes glide in useFrame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  useFrame(({ clock }, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    const now = clock.elapsedTime;
    const state = shot.current;

    // Undo last frame's shake so it never accumulates into the orbit.
    camera.position.sub(appliedShake.current);

    if (effect && effect !== lastEffect.current) {
      const { closeUp, trauma, fovKick } = SHOTS[effect.kind];
      if (closeUp) {
        state.closeUpFactor = closeUp.distance;
        state.closeUpUntil = now + closeUp.seconds;
      }
      if (trauma) state.trauma = Math.max(state.trauma, trauma);
      if (fovKick) state.fovKick = Math.max(state.fovKick, fovKick);
    }
    lastEffect.current = effect;

    const closeUp = celebrating || now < state.closeUpUntil;
    const closeUpFactor = celebrating ? VICTORY_DISTANCE : state.closeUpFactor;
    const tracking = follow || closeUp;
    const goalDistance = closeUp ? followDistance * closeUpFactor : follow ? followDistance : overviewDistance;
    if (Math.abs(goalDistance - lastGoalDistance.current) > 0.01) zooming.current = true;
    lastGoalDistance.current = goalDistance;

    const { goal, offset, step } = scratch.current;
    const k = 1 - Math.exp(-delta * FOLLOW_RATE * (closeUp ? 1.6 : 1));
    goal.set(tracking ? focus[0] : 0, 0, tracking ? focus[2] : 0);
    step.subVectors(goal, orbit.target).multiplyScalar(k);
    orbit.target.add(step);
    camera.position.add(step);

    if (zooming.current) {
      offset.subVectors(camera.position, orbit.target);
      const distance = offset.length();
      const next = distance + (goalDistance - distance) * k;
      camera.position.copy(orbit.target).add(offset.setLength(next));
      if (Math.abs(goalDistance - next) < 0.05) zooming.current = false;
    }
    orbit.update();

    state.trauma = Math.max(0, state.trauma - delta * TRAUMA_DECAY);
    const shake = state.trauma ** 2 * SHAKE_AMPLITUDE;
    appliedShake.current.set(
      Math.sin(now * 47) * shake,
      Math.sin(now * 39 + 1.3) * shake * 0.6,
      Math.sin(now * 53 + 2.1) * shake,
    );
    camera.position.add(appliedShake.current);

    if (camera instanceof PerspectiveCamera) {
      state.fovKick = Math.max(0, state.fovKick - delta * FOV_KICK_DECAY);
      const fov = BASE_FOV + Math.sin(Math.min(1, state.fovKick) * Math.PI * 0.5) * FOV_KICK_DEGREES;
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      autoRotate={celebrating}
      autoRotateSpeed={1.1}
      minDistance={followDistance * 0.45}
      maxDistance={overviewDistance * 1.4}
      minPolarAngle={0.3}
      maxPolarAngle={1.2}
      onStart={() => {
        zooming.current = false;
      }}
    />
  );
}
