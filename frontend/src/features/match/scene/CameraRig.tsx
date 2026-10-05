"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type ComponentRef } from "react";
import { MOUSE, PerspectiveCamera, TOUCH, Vector3 } from "three";
import type { CardId } from "@/game/domain/cards";
import type { CardCastView, TileEffectKind, TileEffectView } from "../model/matchView";
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
  hiddenTrap: { closeUp: { distance: 0.62, seconds: 1.2 }, trauma: 1 },
  skipTurn: { trauma: 0.3 },
  turnSkipped: { trauma: 0.2 },
  extraTurn: { fovKick: 0.6 },
  trapBlocked: { fovKick: 0.4 },
  trapCurse: { trauma: 0.4 },
  realmEnter: {
    closeUp: { distance: 0.5, seconds: 2.4 },
    trauma: 0.55,
    fovKick: 1,
  },
  blessing: { fovKick: 0.5 },
  teleport: { closeUp: { distance: 0.62, seconds: 1.5 } },
  abilityReady: { fovKick: 0.4 },
  abilityUsed: { fovKick: 0.8 },
  levitated: { fovKick: 0.3 },
  gamble: { fovKick: 0.7 },
  seal: { closeUp: { distance: 0.62, seconds: 1.2 }, trauma: 0.5 },
  specter: { closeUp: { distance: 0.62, seconds: 1.2 }, trauma: 0.35 },
  enchanted: { closeUp: { distance: 0.7, seconds: 1 } },
  flames: { closeUp: { distance: 0.62, seconds: 1.2 }, trauma: 0.45 },
  armour: { fovKick: 0.3 },
  cleansed: { fovKick: 0.9, trauma: 0.3 },
  frozen: { trauma: 0.5 },
  timeBent: { closeUp: { distance: 0.7, seconds: 1.2 }, fovKick: 0.8 },
};

/** Cards whose cast is filmed too (the rest are covered by the effects they cause). */
const CAST_SHOTS: Partial<Record<CardId, Shot>> = {
  arcaneBlast: { trauma: 0.9 },
  blindingFlash: { fovKick: 1 },
  berserkFury: { trauma: 0.35 },
  windStep: { closeUp: { distance: 0.8, seconds: 2 } },
  ancestralAwakening: { trauma: 0.45, fovKick: 0.8 },
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

/** Following the focus up close or from midway, or framing the whole board. */
export type CameraFraming = "close" | "mid" | "board";

interface CameraRigProps {
  layout: BoardLayout;
  /** Where the action is (the moving or active player). */
  focus: Vec3;
  /** How the camera frames the play: following the focus up close or from midway, or the whole board. */
  framing: CameraFraming;
  /** Effect being shown; each new one gets its shot. */
  effect: TileEffectView | null;
  /** Someone won: close in on them and circle around. */
  celebrating: boolean;
  /** Card being played; each new one may get its shot. */
  cast: CardCastView | null;
  /** The viewer moved the camera themselves: it stays where they put it, following nobody. */
  free: boolean;
  /** Called as the viewer drags the camera across the board. */
  onFreeLook: () => void;
}

/**
 * Orbit camera that glides to its goal (the whole board, or a close-up following the
 * focus) and films events: close-ups, shakes and field-of-view kicks. Following moves camera
 * and target together, so the player's chosen orbit angle is kept. The viewer can drag across the
 * board to look around: the camera then stays where they put it (`free`) until told to follow again.
 */
export function CameraRig({ layout, focus, framing, effect, celebrating, cast, free, onFreeLook }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / state.size.height);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const zooming = useRef(true);
  /** The viewer is dragging the camera (between OrbitControls' start and end). */
  const dragging = useRef(false);
  const lastGoalDistance = useRef(0);
  const lastEffect = useRef<TileEffectView | null>(null);
  const lastCast = useRef<CardCastView | null>(null);
  const shot = useRef({
    closeUpFactor: 1,
    closeUpUntil: 0,
    trauma: 0,
    fovKick: 0,
  });
  const appliedShake = useRef(new Vector3());
  const scratch = useRef({
    goal: new Vector3(),
    offset: new Vector3(),
    step: new Vector3(),
    beforeUpdate: new Vector3(),
  });

  const aspectFit = Math.max(1, FIT_ASPECT / aspect);
  const overviewDistance = BASE_DISTANCE * boardScaleFor(layout) * aspectFit;
  const followDistance = BASE_DISTANCE * aspectFit;
  // Midway (in proportion) between up close and the whole board.
  const midDistance = Math.sqrt(followDistance * overviewDistance);

  useEffect(() => {
    // The match opens already framed as chosen (on the player, unless it's the whole board).
    const startDistance = framing === "close" ? followDistance : framing === "mid" ? midDistance : overviewDistance;
    const start = framing === "board" ? new Vector3() : new Vector3(focus[0], focus[1] * 0.8, focus[2]);
    camera.position.copy(BASE_DIRECTION).multiplyScalar(startDistance).add(start);
    camera.lookAt(start);
    controls.current?.target.copy(start);
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

    const film = ({ closeUp, trauma, fovKick }: Shot) => {
      if (closeUp) {
        state.closeUpFactor = closeUp.distance;
        state.closeUpUntil = now + closeUp.seconds;
      }
      if (trauma) state.trauma = Math.max(state.trauma, trauma);
      if (fovKick) state.fovKick = Math.max(state.fovKick, fovKick);
    };
    if (effect && effect !== lastEffect.current) film(SHOTS[effect.kind]);
    lastEffect.current = effect;
    if (cast && cast.id !== lastCast.current?.id) film(CAST_SHOTS[cast.card.cardId] ?? {});
    lastCast.current = cast;

    const closeUp = celebrating || now < state.closeUpUntil;
    const closeUpFactor = celebrating ? VICTORY_DISTANCE : state.closeUpFactor;
    const follow = framing !== "board";
    const tracking = follow || closeUp;
    const goalDistance = closeUp
      ? followDistance * closeUpFactor
      : framing === "close"
        ? followDistance
        : framing === "mid"
          ? midDistance
          : overviewDistance;
    if (Math.abs(goalDistance - lastGoalDistance.current) > 0.01) zooming.current = true;
    lastGoalDistance.current = goalDistance;

    const { goal, offset, step, beforeUpdate } = scratch.current;
    const k = 1 - Math.exp(-delta * FOLLOW_RATE * (closeUp ? 1.6 : 1));
    // Up on a realm bridge the target rises with the player, so they stay framed. Left alone
    // while the viewer looks around on their own.
    goal.set(tracking ? focus[0] : 0, tracking ? focus[1] * 0.8 : 0, tracking ? focus[2] : 0);
    step.subVectors(goal, orbit.target).multiplyScalar(free ? 0 : k);
    orbit.target.add(step);
    camera.position.add(step);

    if (zooming.current && !free) {
      offset.subVectors(camera.position, orbit.target);
      const distance = offset.length();
      const next = distance + (goalDistance - distance) * k;
      camera.position.copy(orbit.target).add(offset.setLength(next));
      if (Math.abs(goalDistance - next) < 0.05) zooming.current = false;
    }
    beforeUpdate.copy(orbit.target);
    orbit.update();
    // Only the viewer's own drag moves the target inside the update (a pan): they're looking around.
    if (!free && dragging.current && orbit.target.distanceTo(beforeUpdate) > 0.01) onFreeLook();

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
      enablePan
      // Drag to move across the board (along it, not the screen), right-drag or two fingers to turn.
      screenSpacePanning={false}
      mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }}
      touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }}
      enableDamping
      autoRotate={celebrating}
      autoRotateSpeed={1.1}
      minDistance={followDistance * 0.45}
      maxDistance={overviewDistance * 1.4}
      minPolarAngle={0.3}
      maxPolarAngle={1.2}
      onStart={() => {
        zooming.current = false;
        dragging.current = true;
      }}
      onEnd={() => {
        dragging.current = false;
      }}
    />
  );
}
