"use client";

import { createPortal, useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import { Quaternion, Vector3, type Group, type Mesh, type Object3D } from "three";
import { findBone } from "../core/bones";
import { useGlowColor } from "../shared/glowColor";

/**
 * Where the vial sits from the wrist, in the hand bone's own frame (Mixamo: +y runs along the
 * fingers), in model units: in the middle of the hand, whichever way the arm points.
 */
const HOLD_OFFSET = new Vector3(0, 0.07, 0.015);
/** How quickly the vial appears in the hand, and fades once let go. */
const GROW_RATE = 8;
const FADE_RATE = 5;
const GLASS = "#c7f9e5";
const CORK = "#6b4a2f";

/** Radians the vial turns forward when fully tipped to pour. */
const POUR_ANGLE = 2.1;
const X_AXIS = new Vector3(1, 0, 0);

interface HeldVialProps {
  figure: Object3D;
  color: string;
  active: RefObject<boolean>;
  /** How far the vial is tipped forward to pour, 0 (upright) to 1; uncorked once tipping. */
  tilt?: RefObject<number>;
  /** Filled every frame with where the vial's mouth is, in world space (for a PourStream). */
  mouth?: RefObject<Vector3>;
}

/**
 * A small alchemist's vial, glowing liquid inside, held in the figure's right hand while
 * `active` is on. Bound to the hand bone (Mixamo rig) and kept upright in the figure's own
 * frame, like the witch's staff, unless tipped forward to pour. Meshy figures can't hold props,
 * so it's made in code.
 */
export function HeldVial(props: HeldVialProps) {
  const hand = useMemo(() => findBone(props.figure, "RightHand"), [props.figure]);
  return hand ? createPortal(<Held {...props} hand={hand} />, hand) : null;
}

function Held({ figure, hand, color, active, tilt, mouth }: HeldVialProps & { hand: Object3D }) {
  const uncorked = useRef(false);
  const group = useRef<Group>(null);
  const strength = useRef(0);
  const scratch = useMemo(
    () => ({
      hand: new Quaternion(),
      figure: new Quaternion(),
      handScale: new Vector3(),
      figureScale: new Vector3(),
      tip: new Quaternion(),
    }),
    [],
  );

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    const target = active.current ? 1 : 0;
    const rate = target > strength.current ? GROW_RATE : FADE_RATE;
    strength.current += (target - strength.current) * (1 - Math.exp(-rate * delta));
    node.visible = strength.current > 0.01;
    if (!node.visible) return;

    hand.getWorldQuaternion(scratch.hand);
    figure.getWorldQuaternion(scratch.figure);
    hand.getWorldScale(scratch.handScale);
    figure.getWorldScale(scratch.figureScale);
    // In the hand's frame: model units, undoing any scale the bone itself carries.
    node.position.copy(HOLD_OFFSET).multiplyScalar(scratch.figureScale.x / scratch.handScale.x);
    const tipped = tilt?.current ?? 0;
    uncorked.current = tipped > 0.05;
    scratch.tip.setFromAxisAngle(X_AXIS, tipped * POUR_ANGLE);
    node.quaternion.copy(scratch.hand.invert()).multiply(scratch.figure).multiply(scratch.tip);
    node.scale.setScalar((strength.current * scratch.figureScale.x) / scratch.handScale.x);
    if (mouth?.current) {
      node.updateWorldMatrix(true, false);
      node.localToWorld(mouth.current.set(0, HELD_SIZE * 1.9, 0));
    }
  });

  return (
    <group ref={group} visible={false}>
      <Vial color={color} size={HELD_SIZE} uncorked={uncorked} />
    </group>
  );
}

/** Bulb radius of the held vial, in model units. */
const HELD_SIZE = 0.05;

/**
 * The vial itself, `size` being its bulb's radius: a round glass bulb of glowing liquid, a neck
 * and a cork (popped while `uncorked`).
 */
export function Vial({ color, size, uncorked }: { color: string; size: number; uncorked?: RefObject<boolean> }) {
  const glow = useGlowColor(color, 1.8);
  const liquid = useRef<Mesh>(null);
  const cork = useRef<Mesh>(null);
  useFrame((state) => {
    if (liquid.current) liquid.current.scale.setScalar(0.82 + Math.sin(state.clock.elapsedTime * 6) * 0.03);
    if (cork.current) cork.current.visible = !uncorked?.current;
  });
  return (
    <group>
      <mesh ref={liquid}>
        <sphereGeometry args={[size, 16, 12]} />
        <meshBasicMaterial color={glow} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 1.12, 20, 14]} />
        <meshStandardMaterial color={GLASS} transparent opacity={0.3} roughness={0.05} depthWrite={false} />
      </mesh>
      <mesh position-y={size * 1.45}>
        <cylinderGeometry args={[size * 0.32, size * 0.4, size * 0.9, 12]} />
        <meshStandardMaterial color={GLASS} transparent opacity={0.35} roughness={0.05} depthWrite={false} />
      </mesh>
      <mesh ref={cork} position-y={size * 2.05}>
        <cylinderGeometry args={[size * 0.36, size * 0.3, size * 0.4, 10]} />
        <meshStandardMaterial color={CORK} roughness={0.9} />
      </mesh>
    </group>
  );
}
