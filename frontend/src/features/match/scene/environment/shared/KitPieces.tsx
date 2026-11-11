"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { bakedPiece, tinted } from "./bakedPiece";
import { Instances, type Placed } from "./Instances";
import { KIT_URLS, type Kit, type KitItem } from "./kits";

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
