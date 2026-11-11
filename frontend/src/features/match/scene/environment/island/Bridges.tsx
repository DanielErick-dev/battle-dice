"use client";

import { QuadraticBezierLine } from "@react-three/drei";
import { useMemo } from "react";
import { BoxGeometry, CylinderGeometry, MeshStandardMaterial } from "three";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { Instances, type Placed } from "../shared/Instances";
import type { BridgeSpan } from "./scatter";

/** Top of a bridge's deck: under the stones' feet (see TileMesh), so they rest on the planks. */
const DECK_TOP = -0.16;
const PLANKS_PER_STEP = 5;
const plankGeometry = new BoxGeometry(2.1, 0.08, 0.36);
const woodMaterial = new MeshStandardMaterial({ color: "#4a3626", roughness: 0.85, flatShading: true });
const bridgePostGeometry = new CylinderGeometry(0.07, 0.08, 1.2, 6);
const ropeMaterial = new MeshStandardMaterial({ color: "#7a6c58", roughness: 0.9 });

/** Wooden planks under the stones where the trail crosses the stream, posts on each side and a rope rail between. */
export function Bridges({ spans }: { spans: readonly BridgeSpan[] }) {
  const { planks, posts, ropes } = useMemo(() => {
    const planks: Placed[] = [];
    const posts: Placed[] = [];
    const ropes: { from: Vec3; to: Vec3 }[] = [];
    spans.forEach(({ from, to }, index) => {
      const [dx, dz] = [to[0] - from[0], to[2] - from[2]];
      const length = Math.hypot(dx, dz) || 1;
      // Planks lie across the way: their long side square to the step.
      const turn = Math.atan2(dx, dz);
      for (let plank = 0; plank < PLANKS_PER_STEP; plank++) {
        const t = (plank + 0.5) / PLANKS_PER_STEP;
        planks.push({
          x: from[0] + dx * t,
          y: DECK_TOP - 0.04 + (plank % 2) * 0.012,
          z: from[2] + dz * t,
          size: 1,
          turn,
          tilt: 0,
        });
      }
      for (const side of [-1, 1]) {
        const offset = (point: Vec3): Vec3 => [
          point[0] + (dz / length) * 1.05 * side,
          DECK_TOP,
          point[2] - (dx / length) * 1.05 * side,
        ];
        const [a, b] = [offset(from), offset(to)];
        if (index === 0) posts.push({ x: a[0], y: DECK_TOP, z: a[2], size: 1, turn: 0, tilt: 0 });
        posts.push({ x: b[0], y: DECK_TOP, z: b[2], size: 1, turn: 0, tilt: 0 });
        ropes.push({ from: [a[0], DECK_TOP + 0.5, a[2]], to: [b[0], DECK_TOP + 0.5, b[2]] });
      }
    });
    return { planks, posts, ropes };
  }, [spans]);
  return (
    <group>
      <Instances geometry={plankGeometry} material={woodMaterial} items={planks} shadows />
      <Instances geometry={bridgePostGeometry} material={woodMaterial} items={posts} shadows />
      {ropes.map(({ from, to }, index) => (
        <QuadraticBezierLine
          key={index}
          start={from}
          end={to}
          mid={[(from[0] + to[0]) / 2, from[1] - 0.18, (from[2] + to[2]) / 2]}
          color={ropeMaterial.color}
          lineWidth={2}
        />
      ))}
    </group>
  );
}
