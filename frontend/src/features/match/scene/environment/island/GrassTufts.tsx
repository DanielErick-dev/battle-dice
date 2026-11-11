"use client";

import { ConeGeometry, MeshStandardMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Instances, type Placed } from "../shared/Instances";

/** Three blades leaning apart, merged into one tuft. */
const tuftGeometry = mergeGeometries(
  [-0.35, 0, 0.35].map((lean, index) =>
    new ConeGeometry(0.035, 0.32, 4)
      .translate(0, 0.16, 0)
      .rotateZ(lean)
      .rotateY(index * 2.1),
  ),
);
const tuftMaterial = new MeshStandardMaterial({ color: "#2f4232", roughness: 0.9, flatShading: true });

export function GrassTufts({ tufts }: { tufts: readonly Placed[] }) {
  return <Instances geometry={tuftGeometry} material={tuftMaterial} items={tufts} />;
}
