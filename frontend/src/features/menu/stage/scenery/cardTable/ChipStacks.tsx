"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { CylinderGeometry, MeshStandardMaterial, Object3D, type InstancedMesh } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { useChipTexture } from "./textures";

const CHIP_RADIUS = 0.034;

const CHIP_HEIGHT = 0.009;

/** Every chip of one colour, a little askew in its stack, as one instanced mesh. */
export function ChipStacks({ colour, stacks }: { colour: string; stacks: { x: number; z: number; count: number }[] }) {
  const side = useChipTexture(colour, "side");
  const face = useChipTexture(colour, "face");
  const geometry = useMemo(() => new CylinderGeometry(CHIP_RADIUS, CHIP_RADIUS, CHIP_HEIGHT, 24), []);
  const materials = useMemo(
    () => [
      new MeshStandardMaterial({ map: side, roughness: 0.45 }),
      new MeshStandardMaterial({ map: face, roughness: 0.45 }),
      new MeshStandardMaterial({ map: face, roughness: 0.45 }),
    ],
    [side, face],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      materials.forEach((material) => material.dispose());
    },
    [geometry, materials],
  );
  const count = stacks.reduce((total, stack) => total + stack.count, 0);
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const random = seededRandom(colour.length * 31 + count);
    const dummy = new Object3D();
    let index = 0;
    for (const { x, z, count: chips } of stacks) {
      for (let level = 0; level < chips; level++) {
        dummy.position.set(x + (random() - 0.5) * 0.008, CHIP_HEIGHT * (level + 0.5), z + (random() - 0.5) * 0.008);
        dummy.rotation.set(0, random() * Math.PI * 2, 0);
        dummy.updateMatrix();
        mesh.current.setMatrixAt(index++, dummy.matrix);
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [colour, count, stacks]);

  return <instancedMesh ref={mesh} args={[geometry, materials, count]} />;
}
