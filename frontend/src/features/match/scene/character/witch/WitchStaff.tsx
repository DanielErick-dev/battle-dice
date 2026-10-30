"use client";

import { createPortal, useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import { AdditiveBlending, Color, Quaternion, Vector3, type Group, type MeshBasicMaterial, type Object3D } from "three";

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
/** Dark wood, so the crystal and the runes carry the colour. */
const WOOD = "#1e1014";
const SHARDS = 3;

/**
 * A witch's staff floating at the figure's right palm while `active` is on. Bound to the hand
 * bone (Mixamo rig) so it goes where the hand goes, but placed and kept upright in the figure's
 * own frame, so the wrist's turns in the float pose don't swing it about or through the hand. Made in code: Meshy figures can't
 * hold props. No lights (they'd recompile the scene), only additive glow for the bloom.
 */
export function WitchStaff({ figure, color, active }: { figure: Object3D; color: string; active: RefObject<boolean> }) {
  const hand = useMemo(() => findBone(figure, "RightHand"), [figure]);
  return hand ? createPortal(<Staff figure={figure} hand={hand} color={color} active={active} />, hand) : null;
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
  const group = useRef<Group>(null);
  const crystal = useRef<Group>(null);
  const shards = useRef<Group>(null);
  const halo = useRef<MeshBasicMaterial>(null);
  const strength = useRef(0);
  const glow = useMemo(() => new Color(color).multiplyScalar(1.7), [color]);
  const scratch = useMemo(
    () => ({
      hand: new Quaternion(),
      figure: new Quaternion(),
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
    const target = active.current ? 1 : 0;
    const rate = target > strength.current ? GROW_RATE : FADE_RATE;
    strength.current += (target - strength.current) * (1 - Math.exp(-rate * delta));
    const amount = strength.current;
    node.visible = amount > 0.01;
    if (!node.visible) return;

    const time = state.clock.elapsedTime;
    // Undo the hand's own turn and scale: upright and model-sized in the figure's frame, held
    // in front of the palm (the offset turned with the figure, then brought into the hand's space).
    hand.getWorldQuaternion(scratch.hand);
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
    node.quaternion.copy(scratch.hand.invert()).multiply(scratch.figure).multiply(scratch.lean);
    node.scale.setScalar((amount * scratch.figureScale.x) / scratch.handScale.x);

    if (crystal.current) {
      crystal.current.rotation.y = time * 1.2;
      crystal.current.position.y = STAFF_LENGTH * (1 - GRIP) + 0.1 + Math.sin(time * 2.2) * 0.012;
    }
    if (shards.current) shards.current.rotation.y = -time * 2;
    if (halo.current) halo.current.opacity = (0.4 + Math.sin(time * 5) * 0.1) * amount;
  });

  const top = STAFF_LENGTH * (1 - GRIP);
  return (
    <group ref={group} visible={false}>
      {/* Shaft, gripped below its middle, thicker towards the head, with a pointed foot. */}
      <mesh position-y={top - STAFF_LENGTH / 2}>
        <cylinderGeometry args={[0.018, 0.012, STAFF_LENGTH, 8]} />
        <meshStandardMaterial color={WOOD} roughness={0.75} />
      </mesh>
      <mesh position-y={-STAFF_LENGTH * GRIP - 0.03} rotation-x={Math.PI}>
        <coneGeometry args={[0.014, 0.07, 8]} />
        <meshStandardMaterial color={WOOD} roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Glowing rune bands. */}
      {[-0.28, 0.12, top - 0.14].map((y) => (
        <mesh key={y} position-y={y} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.021, 0.004, 6, 20]} />
          <meshBasicMaterial color={glow} toneMapped={false} />
        </mesh>
      ))}
      {/* Crescent moon cradling the crystal, open to the top. */}
      <mesh position-y={top + 0.1} rotation-z={Math.PI * 1.25}>
        <torusGeometry args={[0.085, 0.012, 8, 32, Math.PI * 1.5]} />
        <meshStandardMaterial color={WOOD} roughness={0.5} metalness={0.4} />
      </mesh>
      <group ref={crystal}>
        <mesh scale={[1, 1.7, 1]}>
          <octahedronGeometry args={[0.04]} />
          <meshBasicMaterial color={glow} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.1, 16, 12]} />
          <meshBasicMaterial
            ref={halo}
            color={glow}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
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

/** The rig's bone ending in `name` (the loader drops the "mixamorig:" colon). */
function findBone(figure: Object3D, name: string): Object3D | null {
  let bone: Object3D | null = null;
  figure.traverse((node) => {
    if (!bone && "isBone" in node && node.name.endsWith(name)) bone = node;
  });
  return bone;
}
