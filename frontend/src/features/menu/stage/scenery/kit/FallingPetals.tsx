"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Object3D, type BufferGeometry, type InstancedMesh, type Material } from "three";
import { petalPose, settle, type Petal } from "./petals";

/** Petals drifting down through the stage, one instanced draw; `petals` are moved in place, so keep them memoised. */
export function FallingPetals({
  geometry,
  material,
  petals,
  top,
  size = 1,
}: {
  geometry: BufferGeometry;
  material: Material;
  petals: Petal[];
  /** Where a petal starts again once it reaches the floor. */
  top: number;
  size?: number;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useFrame(({ clock }, delta) => {
    const instances = mesh.current;
    if (!instances) return;
    const t = clock.elapsedTime;
    petals.forEach((petal, index) => {
      settle(petal, delta, top);
      const { position, rotation } = petalPose(petal, t);
      dummy.position.set(...position);
      dummy.rotation.set(...rotation);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      instances.setMatrixAt(index, dummy.matrix);
    });
    instances.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, petals.length]} frustumCulled={false} />;
}
