"use client";

import { useEffect, useMemo } from "react";
import { Color, DodecahedronGeometry, InstancedMesh, MeshStandardMaterial, Object3D } from "three";
import { seededRandom } from "@/game/domain/random";
import { scatterAround } from "../kit/geometry";

const PEBBLES = 36;

/** Loose pebbles round the terrace's edge: one instanced draw. */
export function Pebbles() {
  const mesh = useMemo(() => {
    const random = seededRandom(149);
    const result = new InstancedMesh(
      new DodecahedronGeometry(1, 0),
      new MeshStandardMaterial({ roughness: 0.95, flatShading: true }),
      PEBBLES,
    );
    const dummy = new Object3D();
    const shade = new Color();
    scatterAround(random, PEBBLES, 0.35, 0.88).forEach(([x, z], index) => {
      const size = 0.01 + random() * 0.018;
      dummy.position.set(x, size * 0.3, z);
      dummy.rotation.set(random() * 3, random() * 3, random() * 3);
      dummy.scale.set(size * (1 + random() * 0.5), size * 0.6, size);
      dummy.updateMatrix();
      result.setMatrixAt(index, dummy.matrix);
      const grey = 0.32 + random() * 0.25;
      result.setColorAt(index, shade.setRGB(grey * 1.05, grey, grey * 0.92));
    });
    return result;
  }, []);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as MeshStandardMaterial).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} />;
}
