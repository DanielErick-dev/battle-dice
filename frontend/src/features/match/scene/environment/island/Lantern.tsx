"use client";

import { Color, CylinderGeometry, MeshStandardMaterial, SphereGeometry } from "three";
import type { Vec3 } from "@/features/shared/board/boardLayout";

const postGeometry = new CylinderGeometry(0.04, 0.06, 1.3, 6).translate(0, 0.65, 0);
const lampGeometry = new SphereGeometry(0.13, 12, 8);
const postMaterial = new MeshStandardMaterial({ color: "#2b2333", roughness: 0.7, metalness: 0.4 });
const lampMaterial = new MeshStandardMaterial({
  color: "#fff1c1",
  emissive: new Color("#fbbf24").multiplyScalar(2.2),
  toneMapped: false,
});

/** A post with a glowing lamp: no light of its own, only glow through the bloom. */
export function Lantern({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh geometry={postGeometry} material={postMaterial} castShadow />
      <mesh geometry={lampGeometry} material={lampMaterial} position-y={1.38} />
    </group>
  );
}
