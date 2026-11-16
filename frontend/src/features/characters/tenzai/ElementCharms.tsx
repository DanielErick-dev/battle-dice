"use client";

import { preloadProps, useFittedProp } from "@/features/characters/core/props";

preloadProps(["tenzaiFlame", "tenzaiBoulder"]);

/** A Meshy charm `height` tall, resting on its centre. */
export function PropCharm({
  id,
  height,
  glow,
}: {
  id: "tenzaiFlame" | "tenzaiBoulder";
  height: number;
  glow?: number;
}) {
  const prop = useFittedProp(id);
  return (
    <mesh geometry={prop.geometry} scale={height} position-y={-height / 2}>
      <meshStandardMaterial
        map={prop.material.map}
        emissiveMap={prop.material.map}
        emissive="#ffffff"
        emissiveIntensity={glow ?? 0}
        transparent={glow !== undefined}
        depthWrite={glow === undefined}
      />
    </mesh>
  );
}

/** A water drop: a sphere pulled into a point at the top. */
export function WaterDrop({ color, glow }: { color: string; glow: number }) {
  return (
    <group scale={0.13}>
      <mesh position-y={-0.2}>
        <sphereGeometry args={[0.8, 20, 14]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={glow * 0.6}
          roughness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh position-y={0.62}>
        <coneGeometry args={[0.69, 1.3, 20, 1, true]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={glow * 0.6}
          roughness={0.1}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}
