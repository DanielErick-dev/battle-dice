"use client";

import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

/**
 * Holds the scene back (suspends) until every model in `models` has loaded, then compiles the
 * scene's shaders and uploads its textures to the GPU before calling `onReady` two frames later,
 * so the match starts with everything in place rather than stalling the first time something
 * shows. Mount it inside the scene's Suspense, after everything else.
 */
export function SceneWarmup({ models, onReady }: { models: readonly string[]; onReady: () => void }) {
  useGLTF([...models]);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    gl.compileAsync(scene, camera)
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
