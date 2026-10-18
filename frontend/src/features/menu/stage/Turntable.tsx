"use client";

import { useFrame } from "@react-three/fiber";
import {
  useEffect,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { Group } from "three";

/** Radians the figure turns per pixel dragged. */
const DRAG_TURN = 0.012;
const TURN_FOLLOW = 12;
const TURN_RETURN = 2.5;
/** Pixels a press can travel and still count as a click rather than a drag. */
const TAP_SLOP = 6;

/** Drag state shared by the DOM wrapper (reads the pointer) and the Turntable (turns); a press that hardly moves calls `onTap`. */
export function useDragTurn(onTap: () => void) {
  const angle = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const travel = useRef(0);
  const tap = useRef(onTap);
  useEffect(() => {
    tap.current = onTap;
  });

  return useMemo(
    () => ({
      angle,
      dragging,
      onPointerDown(event: ReactPointerEvent) {
        dragging.current = true;
        lastX.current = event.clientX;
        travel.current = 0;
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove(event: ReactPointerEvent) {
        if (!dragging.current) return;
        angle.current += (event.clientX - lastX.current) * DRAG_TURN;
        travel.current += Math.abs(event.clientX - lastX.current);
        lastX.current = event.clientX;
      },
      onPointerUp() {
        if (dragging.current && travel.current < TAP_SLOP) tap.current();
        dragging.current = false;
      },
      onPointerCancel() {
        dragging.current = false;
      },
    }),
    [],
  );
}

/** Follows the dragged angle; released, it eases back to face the camera the short way round. */
export function Turntable({
  angleRef,
  draggingRef,
  children,
}: {
  angleRef: RefObject<number>;
  draggingRef: RefObject<boolean>;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    if (!draggingRef.current) {
      // Wrap into (-π, π] so a figure turned past halfway comes back the near way.
      angleRef.current = Math.atan2(Math.sin(angleRef.current), Math.cos(angleRef.current));
      angleRef.current *= Math.exp(-TURN_RETURN * delta);
    }
    node.rotation.y += (angleRef.current - node.rotation.y) * (1 - Math.exp(-TURN_FOLLOW * delta));
  });
  return <group ref={group}>{children}</group>;
}
