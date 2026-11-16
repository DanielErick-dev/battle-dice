"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import { Quaternion, Vector3, type Group, type MeshBasicMaterial, type Object3D } from "three";
import { figureTurnInHand, InHand } from "../core/inHand";
import { AdditiveMaterial } from "../shared/additive";
import { growOrFade } from "../shared/easing";
import { useGlowColor } from "../shared/glowColor";
import { preloadProps, useFittedProp } from "../core/props";

preloadProps(["witchStaff"]);

/** Staff length, and how far below its middle the hand grips it, in model units (Meshy figures stand 1.7). */
const STAFF_LENGTH = 1.25;
const GRIP = 0.42;
/**
 * Where the staff floats from the wrist, in the figure's frame (it faces +z, its right hand is
 * on -x): in front of the open palm, as if held there by magic rather than gripped.
 */
const HOLD_OFFSET = new Vector3(-0.03, -0.04, 0.12);
/** The staff bobs gently under the palm. */
const HOLD_BOB = 0.015;
/** Leans the head of the staff a little out from the body. */
const LEAN = 0.12;
/** How quickly the staff appears, and the slower fade once it's put away. */
const GROW_RATE = 4;
const FADE_RATE = 2;
const SHARDS = 3;

/** Bound to the hand but kept upright in the figure's frame, so the float pose's wrist turns don't swing it. */
export function WitchStaff({ figure, color, active }: { figure: Object3D; color: string; active: RefObject<boolean> }) {
  return (
    <InHand figure={figure} bone="RightHand">
      {(hand) => <Staff figure={figure} hand={hand} color={color} active={active} />}
    </InHand>
  );
}

function Staff({
  figure,
  hand,
  color,
  active,
}: {
  figure: Object3D;
  hand: Object3D;
  color: string;
  active: RefObject<boolean>;
}) {
  const staff = useFittedProp("witchStaff");
  const group = useRef<Group>(null);
  const crystal = useRef<Group>(null);
  const shards = useRef<Group>(null);
  const halo = useRef<MeshBasicMaterial>(null);
  const strength = useRef(0);
  const glow = useGlowColor(color, 1.7);
  const scratch = useMemo(
    () => ({
      figure: new Quaternion(),
      turn: new Quaternion(),
      lean: new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -LEAN),
      handScale: new Vector3(),
      figureScale: new Vector3(),
      hold: new Vector3(),
    }),
    [],
  );

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;
    strength.current = growOrFade(strength.current, active.current, GROW_RATE, FADE_RATE, delta);
    const amount = strength.current;
    node.visible = amount > 0.01;
    if (!node.visible) return;

    const time = state.clock.elapsedTime;
    // Undo the hand's own turn and scale: upright and model-sized in the figure's frame.
    figure.getWorldQuaternion(scratch.figure);
    hand.getWorldScale(scratch.handScale);
    figure.getWorldScale(scratch.figureScale);
    scratch.hold
      .copy(HOLD_OFFSET)
      .setY(HOLD_OFFSET.y + Math.sin(time * 2.4) * HOLD_BOB)
      .multiplyScalar(scratch.figureScale.x)
      .applyQuaternion(scratch.figure)
      .add(hand.getWorldPosition(node.position));
    node.position.copy(hand.worldToLocal(scratch.hold));
    figureTurnInHand(hand, figure, node.quaternion, scratch.turn).multiply(scratch.lean);
    node.scale.setScalar((amount * scratch.figureScale.x) / scratch.handScale.x);

    if (crystal.current) {
      crystal.current.rotation.y = time * 1.2;
      crystal.current.position.y = STAFF_LENGTH * (1 - GRIP) - 0.06 + Math.sin(time * 2.2) * 0.012;
    }
    if (shards.current) shards.current.rotation.y = -time * 2;
    if (halo.current) halo.current.opacity = (0.4 + Math.sin(time * 5) * 0.1) * amount;
  });

  return (
    <group ref={group} visible={false}>
      {/* The Meshy staff, gripped below its middle. */}
      <mesh
        geometry={staff.geometry}
        material={staff.material}
        scale={STAFF_LENGTH}
        position-y={-STAFF_LENGTH * GRIP}
        castShadow
      />
      <group ref={crystal}>
        <mesh>
          <sphereGeometry args={[0.1, 16, 12]} />
          <AdditiveMaterial ref={halo} color={glow} />
        </mesh>
        <group ref={shards}>
          {Array.from({ length: SHARDS }, (_, index) => {
            const angle = (index / SHARDS) * Math.PI * 2;
            return (
              <mesh
                key={index}
                position={[Math.cos(angle) * 0.1, Math.sin(angle * 2) * 0.02, Math.sin(angle) * 0.1]}
                scale={[1, 1.8, 1]}
              >
                <octahedronGeometry args={[0.012]} />
                <meshBasicMaterial color={glow} toneMapped={false} />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}
