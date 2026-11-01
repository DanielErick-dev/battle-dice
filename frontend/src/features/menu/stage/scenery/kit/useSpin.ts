import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import type { Object3D } from "three";

/** A ref whose object keeps turning about its own z at `rate` radians a second: rune rings, vortices. */
export function useSpin<T extends Object3D>(rate: number): RefObject<T | null> {
  const object = useRef<T>(null);
  useFrame((_, delta) => {
    if (object.current) object.current.rotation.z += delta * rate;
  });
  return object;
}
