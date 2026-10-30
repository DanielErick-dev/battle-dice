"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import { Instances, type Placed } from "./instances";

/** The free kits' pieces, one GLB each (see scripts/props/build-kits.mjs). */
export const KIT_URLS = {
  kaykit: "/models/island/kaykit.glb",
  kenney: "/models/island/kenney.glb",
  dungeon: "/models/island/dungeon.glb",
  wasteland: "/models/island/wasteland.glb",
} as const;
export type Kit = keyof typeof KIT_URLS;

/** A piece's mesh from the pack, its node's placement (and quantization) baked into plain float geometry. */
export function bakedPiece(node: Object3D | undefined): { geometry: BufferGeometry; material: Material } | null {
  let mesh: Mesh | undefined;
  node?.traverse((child) => {
    if (!mesh && (child as Mesh).isMesh) mesh = child as Mesh;
  });
  if (!mesh || !node) return null;
  node.updateMatrixWorld(true);
  const source = mesh.geometry;
  const geometry = new BufferGeometry();
  for (const name of ["position", "normal", "uv"] as const) {
    const attribute = source.getAttribute(name);
    if (!attribute) continue;
    const values = new Float32Array(attribute.count * attribute.itemSize);
    for (let index = 0; index < attribute.count; index++) {
      for (let part = 0; part < attribute.itemSize; part++) {
        values[index * attribute.itemSize + part] = attribute.getComponent(index, part);
      }
    }
    geometry.setAttribute(name, new Float32BufferAttribute(values, attribute.itemSize));
  }
  if (source.index) geometry.setIndex(Array.from(source.index.array));
  // Relative to the pack's root, which sits at the origin.
  geometry.applyMatrix4(mesh.matrixWorld);
  return { geometry, material: mesh.material as Material };
}

/** A piece of a kit set down: `scale` is its whole scale in world units. */
export interface KitItem {
  piece: string;
  x: number;
  y: number;
  z: number;
  turn: number;
  scale: number;
}

/** Pieces of one kit, as many as given: one instanced mesh per kind of piece. */
export function KitPieces({
  kit,
  items,
  shadows = true,
  tint,
}: {
  kit: Kit;
  items: readonly KitItem[];
  shadows?: boolean;
  /** Multiplies their colours (rust on the wasteland's wrecks); as modelled without one. */
  tint?: string;
}) {
  const { scene } = useGLTF(KIT_URLS[kit]);
  const kinds = useMemo(() => {
    const byPiece = new Map<string, Placed[]>();
    for (const { piece, x, y, z, turn, scale } of items) {
      const list = byPiece.get(piece) ?? [];
      list.push({ x, y, z, turn, tilt: 0, size: scale });
      byPiece.set(piece, list);
    }
    return [...byPiece].flatMap(([piece, placed]) => {
      const baked = bakedPiece(scene.getObjectByName(piece));
      if (!baked) return [];
      const material = tint ? tinted(baked.material, tint) : baked.material;
      return [{ piece, placed, geometry: baked.geometry, material, own: material !== baked.material }];
    });
  }, [scene, items, tint]);
  useEffect(
    () => () =>
      kinds.forEach(({ geometry, material, own }) => {
        geometry.dispose();
        if (own) material.dispose();
      }),
    [kinds],
  );
  return (
    <group>
      {kinds.map(({ piece, placed, geometry, material }) => (
        <Instances key={piece} geometry={geometry} material={material} items={placed} shadows={shadows} />
      ))}
    </group>
  );
}

/** One piece on its own (a ship that moves): its geometry and material. */
export function useKitPiece(kit: Kit, piece: string) {
  const { scene } = useGLTF(KIT_URLS[kit]);
  const baked = useMemo(() => bakedPiece(scene.getObjectByName(piece)), [scene, piece]);
  useEffect(() => () => baked?.geometry.dispose(), [baked]);
  return baked;
}

/** A copy of the material with its colour multiplied by `tint`. */
function tinted(material: Material, tint: string): Material {
  const copy = material.clone() as MeshStandardMaterial;
  copy.color?.multiply(new Color(tint));
  return copy;
}
