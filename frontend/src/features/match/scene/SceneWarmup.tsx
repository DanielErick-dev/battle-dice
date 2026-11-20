"use client";

import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import type { Object3D } from "three";

/** Compiles shaders and uploads textures before `onReady`, so the match never stalls the first time something shows. */
export function SceneWarmup({ models, onReady }: { models: readonly string[]; onReady: () => void }) {
  useGLTF([...models]);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    // Hidden parts (a Susanoo, chains, the dice) are skipped by the compile: shown for it, hidden again at once.
    const hidden: Object3D[] = [];
    scene.traverse((node) => {
      if (!node.visible) hidden.push(node);
    });
    for (const node of hidden) node.visible = true;
    const compiled = gl.compileAsync(scene, camera);
    for (const node of hidden) node.visible = false;
    compiled
      .catch(() => undefined)
      .then(() => {
        // Two frames drawn with everything compiled before the curtain lifts.
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => {
            if (!cancelled) onReady();
          });
        });
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [gl, scene, camera, onReady]);

  return null;
}
