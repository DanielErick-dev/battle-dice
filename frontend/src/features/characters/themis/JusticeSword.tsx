"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Quaternion, Vector3, type Group, type Object3D } from "three";
import { handUnit, InHand } from "../core/inHand";
import { preloadProps, Prop, usePropMesh } from "../core/props";

/** The sword's length, and the share above its middle where the fist closes (measured: guard at 0.15, pommel at 0.4). */
export const SWORD_LENGTH = 0.9;
const SWORD_GRIP = 0.31;
/** The Meshy blade leans ~10° off its vertical (point at -y); turned back straight. */
export const SWORD_LEAN = 0.175;
/** The grip across the palm, in the hand bone's frame (Mixamo: +y along the fingers, palm at -x, index side at +z). */
const SWORD_HOLD = new Vector3(-0.025, 0.055, 0);
/** Out of the fist past the index, tilted toward the fingers as a real grip is. */
const SWORD_POINT = new Vector3(0, Math.sin(0.35), Math.cos(0.35));
const SWORD_AIM = new Quaternion().setFromUnitVectors(new Vector3(0, -1, 0), SWORD_POINT);

preloadProps(["justiceSword"]);

/**
 * Her sword (PROPS.justiceSword) gripped in the right fist: it turns with the hand, raised when she raises it.
 * While `away` is on (planted in the ground in her intro) it isn't in the hand.
 */
export function JusticeSword({ figure, away }: { figure: Object3D; away?: RefObject<boolean> }) {
  const { geometry, material } = usePropMesh("justiceSword");
  return (
    <InHand figure={figure} bone="RightHand">
      {(hand) => (
        <SwordGrip figure={figure} hand={hand} away={away}>
          <Prop geometry={geometry} material={material} height={SWORD_LENGTH} />
        </SwordGrip>
      )}
    </InHand>
  );
}

/**
 * The frame of the sword in her fist, inside the hand bone: `children` drawn there sit where the blade's middle
 * is, SWORD_LENGTH units standing for the whole blade (a sword flying back to her hand aims for it).
 */
export function SwordGrip({
  figure,
  hand,
  away,
  children,
}: {
  figure: Object3D;
  hand: Object3D;
  away?: RefObject<boolean>;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  const scratch = useMemo(() => ({ hand: new Vector3(), figure: new Vector3() }), []);

  useFrame(() => {
    const node = group.current;
    if (!node) return;
    node.visible = !away?.current;
    const unit = handUnit(hand, figure, scratch);
    node.scale.setScalar(unit);
    node.position.copy(SWORD_HOLD).multiplyScalar(unit);
  });

  // Flat of the blade facing the palm, as a fist holds it.
  return (
    <group ref={group}>
      <group quaternion={SWORD_AIM}>
        <group position-y={-SWORD_LENGTH * SWORD_GRIP} rotation-y={Math.PI / 2}>
          <group rotation-z={SWORD_LEAN}>{children}</group>
        </group>
      </group>
    </group>
  );
}
