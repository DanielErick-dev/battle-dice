"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { DoubleSide, MeshStandardMaterial, Object3D, ShapeGeometry, Shape, type InstancedMesh } from "three";
import { seededRandom } from "@/game/domain/random";

const PETALS = 70;

const PETAL_SIZE = 0.02;

/** Where petals drift down through: under the boughs and across the stage. */
const PETAL_BOX = { minX: -1.1, maxX: 0.7, minZ: -0.95, maxZ: 0.6, top: 1.5 };

/** Petals drifting down and fluttering, one instanced mesh. */
export function FallingPetals() {
  const geometry = useMemo(() => {
    // A petal with the notch at its tip that cherry petals have.
    const shape = new Shape();
    shape.moveTo(0, -0.5);
    shape.bezierCurveTo(0.45, -0.3, 0.45, 0.3, 0.14, 0.5);
    shape.lineTo(0, 0.36);
    shape.lineTo(-0.14, 0.5);
    shape.bezierCurveTo(-0.45, 0.3, -0.45, -0.3, 0, -0.5);
    return new ShapeGeometry(shape, 6);
  }, []);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#f9b8d6",
        emissive: "#f487b6",
        emissiveIntensity: 0.25,
        roughness: 0.8,
        side: DoubleSide,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  const petals = useMemo(() => {
    const random = seededRandom(43);
    return Array.from({ length: PETALS }, () => ({
      x: PETAL_BOX.minX + random() * (PETAL_BOX.maxX - PETAL_BOX.minX),
      z: PETAL_BOX.minZ + random() * (PETAL_BOX.maxZ - PETAL_BOX.minZ),
      height: random() * PETAL_BOX.top,
      speed: 0.07 + random() * 0.07,
      phase: random() * Math.PI * 2,
      spin: 1 + random() * 2,
    }));
  }, []);
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useFrame(({ clock }, delta) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime;
    petals.forEach((petal, index) => {
      petal.height -= petal.speed * delta;
      if (petal.height < 0) petal.height += PETAL_BOX.top;
      dummy.position.set(
        petal.x + Math.sin(t * 0.7 + petal.phase) * 0.12,
        petal.height,
        petal.z + Math.cos(t * 0.5 + petal.phase) * 0.06,
      );
      dummy.rotation.set(t * petal.spin + petal.phase, petal.phase, Math.sin(t * 1.5 + petal.phase) * 0.8);
      dummy.scale.setScalar(PETAL_SIZE);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, PETALS]} frustumCulled={false} />;
}
