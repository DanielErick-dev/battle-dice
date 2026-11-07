"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  MathUtils,
  PerspectiveCamera,
  Quaternion,
  Vector3,
  type Group,
  type Object3D,
  type Sprite,
} from "three";
import type { BoneName } from "../core/bones";
import { handUnit, InHand } from "../core/inHand";
import { useSoftDisc } from "../shared/softDisc";
import { useAge } from "@/features/shared/three/useAge";
import { createEmberMaterial, createFlameGeometry, createFlameMaterial, setUniforms } from "./flameShader";

interface FlameSpot {
  bone: BoneName;
  /** In the bone's own frame, model units (Mixamo: +y runs down the limb; a right palm faces -x, a left one +x). */
  offset: Vector3;
  /** Model units wide (the figure is ~1.8 tall). */
  width: number;
  /** Sheds embers too (the hands). */
  embers?: boolean;
}

/** A flame off each palm (his clothes burn with ClothFire). */
const SPOTS: readonly FlameSpot[] = [
  { bone: "RightHand", offset: new Vector3(-0.05, 0.07, 0), width: 0.17, embers: true },
  { bone: "LeftHand", offset: new Vector3(0.05, 0.07, 0), width: 0.17, embers: true },
];
const EMBERS = 9;
/** Ember size in world units, turned into pixels each frame. */
const EMBER_WORLD_SIZE = 0.05;
const UP = new Vector3(0, 1, 0);

/** Seconds a flame takes to flare up as it lights. */
const LIGHT_SECONDS = 0.25;

/**
 * Akane's fire: a live flame off each palm, always upright whatever the hand does. Each trails behind and stretches
 * when its hand moves fast, breathes on its own and sheds embers. `igniteAt`: seconds after mounting they light (the
 * snap of his fingers in his intro); lit from the start without it.
 */
export function BodyFlames({ figure, igniteAt = 0 }: { figure: Object3D; igniteAt?: number }) {
  return SPOTS.map((spot, index) => (
    <InHand key={spot.bone} figure={figure} bone={spot.bone}>
      {(hand) => <Flame figure={figure} hand={hand} spot={spot} seed={index * 4.1} igniteAt={igniteAt} />}
    </InHand>
  ));
}

function Flame({
  figure,
  hand,
  spot,
  seed,
  igniteAt,
}: {
  figure: Object3D;
  hand: Object3D;
  spot: FlameSpot;
  seed: number;
  igniteAt: number;
}) {
  const age = useAge();
  const { offset, width } = spot;
  const anchor = useRef<Group>(null);
  const upright = useRef<Group>(null);
  const glow = useRef<Sprite>(null);
  const motion = useRef({ started: false, lean: 0, stretch: 0 });
  const disc = useSoftDisc();
  const flame = useMemo(() => ({ geometry: createFlameGeometry(), material: createFlameMaterial() }), []);
  const embers = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(EMBERS * 3), 3));
    geometry.setAttribute(
      "aSeed",
      new BufferAttribute(
        Float32Array.from({ length: EMBERS }, (_, i) => (i * 0.618034) % 1),
        1,
      ),
    );
    return { geometry, material: createEmberMaterial() };
  }, []);
  const state = useMemo(
    () => ({
      scratch: { hand: new Vector3(), figure: new Vector3() },
      at: new Vector3(),
      last: new Vector3(),
      velocity: new Vector3(),
      moved: new Vector3(),
      right: new Vector3(),
      parent: new Quaternion(),
      facing: new Quaternion(),
    }),
    [],
  );

  useEffect(
    () => () => {
      flame.geometry.dispose();
      flame.material.dispose();
      embers.geometry.dispose();
      embers.material.dispose();
    },
    [flame, embers],
  );

  useFrame(({ clock, camera, gl }, delta) => {
    const node = anchor.current;
    const card = upright.current;
    if (!node || !card) return;
    const lit = Math.min(1, Math.max(0, (age(clock.elapsedTime) - igniteAt) / LIGHT_SECONDS));
    node.visible = lit > 0;
    const unit = handUnit(hand, figure, state.scratch);
    node.scale.setScalar(unit * lit);
    node.position.copy(offset).multiplyScalar(unit);

    // Stand upright in the world, facing the camera round the vertical only.
    node.getWorldPosition(state.at);
    const yaw = Math.atan2(camera.position.x - state.at.x, camera.position.z - state.at.z);
    state.facing.setFromAxisAngle(UP, yaw);
    node.getWorldQuaternion(state.parent);
    card.quaternion.copy(state.parent.invert().multiply(state.facing));

    // The flame drags against the hand's motion, as fire does in the air.
    const step = Math.max(delta, 1 / 240);
    if (motion.current.started)
      state.velocity.lerp(state.moved.subVectors(state.at, state.last).divideScalar(step), 0.15);
    state.last.copy(state.at);
    motion.current.started = true;
    const figureScale = state.scratch.figure.x || 1;
    state.right.set(1, 0, 0).applyQuaternion(state.facing);
    const sideways = state.velocity.dot(state.right) / figureScale;
    const speed = state.velocity.length() / figureScale;
    const m = motion.current;
    m.lean = MathUtils.damp(m.lean, MathUtils.clamp(-sideways * 0.18, -0.55, 0.55), 8, delta);
    m.stretch = MathUtils.damp(m.stretch, Math.min(speed * 0.08, 0.45), 6, delta);

    const t = clock.elapsedTime + seed;
    const breath = 1 + Math.sin(t * 1.9) * 0.06 + Math.sin(t * 5.3) * 0.03;
    setUniforms(flame.material, { uTime: t, uLean: m.lean, uStretch: m.stretch + (breath - 1) * 1.5, uGlow: 1.45 });
    const fov = camera instanceof PerspectiveCamera ? camera.fov : 50;
    setUniforms(embers.material, {
      uTime: t,
      uLean: m.lean,
      uSize: (EMBER_WORLD_SIZE * gl.domElement.height) / (2 * Math.tan(MathUtils.degToRad(fov) / 2)),
    });

    if (glow.current) {
      glow.current.scale.setScalar(width * 4.5 * breath);
      glow.current.material.opacity = 0.42 + Math.sin(t * 7.1) * 0.05 + Math.sin(t * 11.3) * 0.03;
    }
  });

  return (
    <group ref={anchor}>
      <group ref={upright}>
        <sprite ref={glow} position-y={width * 0.45}>
          <spriteMaterial map={disc} color="#ff6a1a" transparent depthWrite={false} blending={AdditiveBlending} />
        </sprite>
        <group scale={width}>
          <mesh geometry={flame.geometry} material={flame.material} renderOrder={2} />
          {spot.embers && (
            <points geometry={embers.geometry} material={embers.material} renderOrder={3} frustumCulled={false} />
          )}
        </group>
      </group>
    </group>
  );
}
