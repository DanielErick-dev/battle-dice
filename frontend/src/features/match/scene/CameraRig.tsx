"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import type { BoardLayout } from "./boardLayout";

const BASE_POSITION = [0, 12, 12.5] as const;
const BASE_DISTANCE = Math.hypot(...BASE_POSITION);
/** Grid extent the base position was tuned for (the 5×4 training board). */
const BASE_WIDTH = 10.8;
const BASE_DEPTH = 8.55;
/** Below this width/height ratio the camera backs off so the whole board stays in view. */
const FIT_ASPECT = 1.1;

export function CameraRig({ layout }: { layout: BoardLayout }) {
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / state.size.height);
  const boardScale = Math.max(1, layout.width / BASE_WIDTH, layout.depth / BASE_DEPTH);
  const zoomOut = boardScale * Math.max(1, FIT_ASPECT / aspect);

  useEffect(() => {
    const [x, y, z] = BASE_POSITION;
    camera.position.set(x * zoomOut, y * zoomOut, z * zoomOut);
    camera.lookAt(0, 0, 0);
  }, [camera, zoomOut]);

  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      enableDamping
      minDistance={BASE_DISTANCE * 0.6 * zoomOut}
      maxDistance={BASE_DISTANCE * 1.5 * zoomOut}
      minPolarAngle={0.3}
      maxPolarAngle={1.2}
    />
  );
}
