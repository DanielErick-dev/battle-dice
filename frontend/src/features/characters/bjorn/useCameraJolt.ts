import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import type { Vector3 } from "three";

/** How hard and how briefly the camera jolts with a blow. */
const JOLT = 0.06;
const JOLT_DECAY = 9;

/** The rest spot is kept on the camera, so an intro replayed mid-jolt doesn't take the jolted spot as home. */
export function useCameraJolt(): (since: number) => void {
  const camera = useThree((state) => state.camera);
  const home = useMemo(() => (camera.userData.home ??= camera.position.clone()) as Vector3, [camera]);
  useEffect(() => () => void camera.position.copy(home), [camera, home]);
  return (since: number) => {
    const jolt = since < 0.6 ? JOLT * Math.exp(-since * JOLT_DECAY) : 0;
    camera.position.set(home.x + Math.sin(since * 70) * jolt, home.y + Math.sin(since * 53 + 1) * jolt, home.z);
  };
}
