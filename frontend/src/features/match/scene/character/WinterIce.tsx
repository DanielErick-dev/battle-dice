"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, MeshPhysicalMaterial, Object3D, type InstancedMesh } from "three";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../boardLayout";

const TILE_TOP = TILE_HEIGHT / 2;
const ICE_HEIGHT = 0.1;

/**
 * The tiles Eternal Winter froze (see fairy.ts): each one sealed under a sheet of pale blue ice,
 * glinting. One instanced mesh for them all, since the ice can cover the whole path.
 */
export function WinterIce({ positions }: { positions: readonly Vec3[] }) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new BoxGeometry(TILE_SIZE * 1.03, ICE_HEIGHT, TILE_SIZE * 1.03), []);
  const material = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: "#cfeeff",
        roughness: 0.08,
        metalness: 0.05,
        clearcoat: 1,
        transparent: true,
        opacity: 0.82,
        emissive: new Color("#7cc8ff"),
        emissiveIntensity: 0.25,
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

  useLayoutEffect(() => {
    const node = mesh.current;
    if (!node) return;
    const place = new Object3D();
    positions.forEach(([x, y, z], index) => {
      place.position.set(x, y + TILE_TOP + ICE_HEIGHT / 2 - 0.01, z);
      place.updateMatrix();
      node.setMatrixAt(index, place.matrix);
    });
    node.count = positions.length;
    node.instanceMatrix.needsUpdate = true;
    node.computeBoundingSphere();
  }, [positions]);

  // A slow cold shimmer over the ice.
  useFrame(({ clock }) =>
    material.setValues({
      emissiveIntensity: 0.22 + Math.sin(clock.elapsedTime * 1.4) * 0.06,
    }),
  );

  if (positions.length === 0) return null;
  return <instancedMesh ref={mesh} args={[geometry, material, positions.length]} receiveShadow />;
}
