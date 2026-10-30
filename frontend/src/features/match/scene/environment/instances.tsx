"use client";

import { useLayoutEffect, useRef } from "react";
import { Color, Object3D, type BufferGeometry, type InstancedMesh, type Material } from "three";

/** One copy of something set down on the island: where, how big, which way turned (and leaning). */
export interface Placed {
  x: number;
  y: number;
  z: number;
  size: number;
  turn: number;
  tilt: number;
  /** Tints this instance alone (flowers). */
  color?: string;
}

/** One instanced mesh holding every placement; `shape` sets each instance's own transform on top. */
export function Instances({
  geometry,
  material,
  items,
  shape = keepShape,
  shadows = false,
}: {
  geometry: BufferGeometry;
  material: Material;
  items: readonly Placed[];
  shape?: (place: Object3D, item: Placed) => void;
  shadows?: boolean;
}) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const node = mesh.current;
    if (!node) return;
    const place = new Object3D();
    const tint = new Color();
    items.forEach((item, index) => {
      if (item.color) node.setColorAt(index, tint.set(item.color));
      place.position.set(item.x, item.y, item.z);
      place.rotation.set(item.tilt, item.turn, 0);
      place.scale.setScalar(item.size);
      shape(place, item);
      place.updateMatrix();
      node.setMatrixAt(index, place.matrix);
    });
    node.count = items.length;
    node.instanceMatrix.needsUpdate = true;
    if (node.instanceColor) node.instanceColor.needsUpdate = true;
    node.computeBoundingSphere();
  }, [items, shape]);
  const count = Math.max(1, items.length);
  return <instancedMesh key={count} ref={mesh} args={[geometry, material, count]} castShadow={shadows} receiveShadow />;
}

export const keepShape = () => {};
