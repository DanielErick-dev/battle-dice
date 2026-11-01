"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { DoubleSide, type Mesh } from "three";
import { useCanvasTexture } from "../kit/textures";
import { LATTICE } from "./textures";

/** A violet sea fan on the right, rocking in the current. */
export function SeaFan() {
  const lattice = useCanvasTexture(LATTICE);
  const fan = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (fan.current) fan.current.rotation.x = 0.15 * Math.sin(clock.elapsedTime * 0.8);
  });
  return (
    <group position={[0.3, 0, -0.88]} rotation-y={-0.3}>
      <mesh ref={fan}>
        <circleGeometry args={[0.2, 24, 0, Math.PI]} />
        <meshStandardMaterial map={lattice} color="#c084fc" alphaTest={0.4} side={DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  );
}
