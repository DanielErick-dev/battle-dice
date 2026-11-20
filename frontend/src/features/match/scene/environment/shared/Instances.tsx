"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { chunked } from "./chunks";
import { Color, Object3D, type BufferGeometry, type InstancedMesh, type Material } from "three";

/** One copy of something set down on the map: where, how big, which way turned (and leaning). */
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

/** Every placement, one instanced mesh per square of the map (see chunked); `shape` sets each instance's own transform. */
export function Instances(props: {
  geometry: BufferGeometry;
  material: Material;
  items: readonly Placed[];
  shape?: (place: Object3D, item: Placed) => void;
  shadows?: boolean;
}) {
  const groups = useMemo(() => chunked(props.items), [props.items]);
  return (
    <>
      {groups.map((items, index) => (
        <InstanceChunk key={index} {...props} items={items} />
      ))}
    </>
  );
}

function InstanceChunk({
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

const keepShape = () => {};
