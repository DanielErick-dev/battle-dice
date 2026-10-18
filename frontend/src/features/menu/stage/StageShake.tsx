"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import { Vector3 } from "three";

/** How far the view jolts in the strongest gust (stage units). */
const SHAKE = 0.035;

/** Shakes the camera with the wind of an entrance's wingbeats (see seraphEntrance). */
export function StageShake({ gust }: { gust: RefObject<number> }) {
  const applied = useRef(new Vector3());
  useFrame(({ camera, clock }) => {
    camera.position.sub(applied.current);
    const strength = gust.current ** 2 * SHAKE;
    const t = clock.elapsedTime;
    applied.current.set(
      Math.sin(t * 43) * strength,
      Math.sin(t * 37 + 1.3) * strength * 0.7,
      Math.sin(t * 51) * strength * 0.4,
    );
    camera.position.add(applied.current);
  });
  return null;
}
