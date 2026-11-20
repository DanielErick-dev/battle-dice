"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import type { Group, Object3D } from "three";

/** Counts the objects under `root`, the cheap sign that something new was mounted inside it. */
function countNodes(root: Object3D): number {
  let count = 0;
  root.traverse(() => void count++);
  return count;
}

/**
 * Holds an effect back for the few frames its new shaders take to compile in the background, instead of the whole
 * game stalling while they compile on the spot the first time it shows (with the browser's parallel compile, the
 * effect just starts a frame or two later). Only things mounted mid-match need this: the rest is compiled at load.
 */
export function WarmGroup({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);
  const known = useRef(0);
  const warming = useRef(false);
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);

  useFrame(() => {
    const node = group.current;
    if (!node || warming.current) return;
    const count = countNodes(node);
    if (count <= known.current) {
      known.current = count;
      return;
    }
    known.current = count;
    const programs = gl.info.programs?.length ?? 0;
    const compiled = gl.compileAsync(node, camera, scene);
    // Nothing new to compile (more arrows of a volley, say): it shows at once, never blinking.
    if ((gl.info.programs?.length ?? 0) === programs) return;
    warming.current = true;
    node.visible = false;
    compiled
      .catch(() => undefined)
      .then(() => {
        warming.current = false;
        if (group.current) group.current.visible = true;
      });
  });

  return <group ref={group}>{children}</group>;
}
