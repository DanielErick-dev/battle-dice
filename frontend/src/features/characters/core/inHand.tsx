"use client";

import { createPortal } from "@react-three/fiber";
import type { ReactNode } from "react";
import type { Object3D, Quaternion, Vector3 } from "three";
import { useBone, type BoneName } from "./bones";

/**
 * Mounts what `children` draws inside the figure's `bone` (a hand), so it goes wherever the hand
 * goes. Meshy figures can't hold props: everything held is bound to the bone like this.
 */
export function InHand({
  figure,
  bone,
  children,
}: {
  figure: Object3D;
  bone: BoneName;
  children: (hand: Object3D) => ReactNode;
}) {
  const hand = useBone(figure, bone);
  return hand ? createPortal(children(hand), hand) : null;
}

/** How many of the hand bone's own units make one model unit of the figure (undoing any scale the bone carries). */
export function handUnit(hand: Object3D, figure: Object3D, scratch: { hand: Vector3; figure: Vector3 }): number {
  hand.getWorldScale(scratch.hand);
  figure.getWorldScale(scratch.figure);
  return scratch.figure.x / scratch.hand.x;
}

/** Into `out`: the figure's own turn seen from the hand, so something held there stays upright as the figure stands. */
export function figureTurnInHand(hand: Object3D, figure: Object3D, out: Quaternion, scratch: Quaternion): Quaternion {
  hand.getWorldQuaternion(out).invert();
  figure.getWorldQuaternion(scratch);
  return out.multiply(scratch);
}
