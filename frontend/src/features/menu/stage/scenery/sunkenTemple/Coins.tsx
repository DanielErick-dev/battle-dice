"use client";

import { useLayoutEffect, useRef } from "react";
import { MeshStandardMaterial, Object3D, type InstancedMesh } from "three";
import { seededRandom } from "@/game/domain/random";

const COINS = 16;

/** Gold coins spilled from the chest. */
export function Coins({ gold }: { gold: MeshStandardMaterial }) {
  const coins = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = coins.current;
    if (!mesh) return;
    const random = seededRandom(51);
    const dummy = new Object3D();
    for (let index = 0; index < COINS; index++) {
      const angle = -Math.PI * (0.2 + random() * 0.6);
      const distance = 0.45 + random() * 0.35;
      dummy.position.set(Math.cos(angle) * distance, 0.004 + random() * 0.004, Math.sin(angle) * distance * 0.9);
      dummy.rotation.set((random() - 0.5) * 0.5, random() * Math.PI, (random() - 0.5) * 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={coins} args={[undefined, gold, COINS]}>
      <cylinderGeometry args={[0.018, 0.018, 0.005, 12]} />
    </instancedMesh>
  );
}
