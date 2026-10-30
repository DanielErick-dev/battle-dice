"use client";

import { Sparkles } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { BackSide, PlaneGeometry } from "three";
import { useCanvasTexture, type Painter } from "@/features/menu/stage/scenery/textures";
import type { Vec3 } from "../boardLayout";
import { Flames } from "./Dungeon";
import { ChimneySmoke } from "./Island";
import { TRAIL_GROUND } from "./islandTerrain";
import { KitPieces } from "./kits";
import { paintCrackedRoad, TrailRoad } from "./road";
import { planWasteland } from "./wasteland";

const GROUND_REPEAT = 8;

/**
 * The wasteland map: cracked dry earth under a low sky of soot, shells of buildings, rusted wrecks by an
 * old asphalt road, debris and dead trees, fires in baskets sending up smoke, ash falling.
 */
export function Wasteland({ trail }: { trail: readonly Vec3[] }) {
  const plan = useMemo(() => planWasteland(trail), [trail]);
  const { minX, maxX, minZ, maxZ } = plan.bounds;
  const [width, depth] = [maxX - minX + 30, maxZ - minZ + 30];
  const earth = useCanvasTexture({ size: 512, draw: paintCrackedEarth, seed: 9, tile: true });
  // The cracks repeat every GROUND_REPEAT units: the plane's UVs run past 1 to tile them.
  const ground = useMemo(() => {
    const plane = new PlaneGeometry(width, depth);
    const uv = plane.getAttribute("uv");
    for (let index = 0; index < uv.count; index++) {
      uv.setXY(index, (uv.getX(index) * width) / GROUND_REPEAT, (uv.getY(index) * depth) / GROUND_REPEAT);
    }
    return plane;
  }, [width, depth]);
  useEffect(() => () => ground.dispose(), [ground]);
  const centre: Vec3 = [(minX + maxX) / 2, 0, (minZ + maxZ) / 2];

  return (
    <group>
      {/* A low sky of smoke and soot. */}
      <mesh position={centre}>
        <sphereGeometry args={[Math.max(width, depth) * 1.4, 24, 16]} />
        <meshBasicMaterial color="#2a201b" side={BackSide} fog={false} />
      </mesh>
      <mesh geometry={ground} rotation-x={-Math.PI / 2} position={[centre[0], TRAIL_GROUND, centre[2]]} receiveShadow>
        <meshStandardMaterial map={earth} roughness={1} color="#8a7c6e" />
      </mesh>
      <TrailRoad trail={trail} heightAt={() => TRAIL_GROUND} paint={paintCrackedRoad} />
      <KitPieces kit="wasteland" items={plan.pieces} />
      <KitPieces kit="wasteland" items={plan.wrecks} tint="#7a5a44" />
      <Flames flames={plan.fires} />
      <ChimneySmoke chimneys={plan.fires} />
      <Sparkles
        count={Math.round((maxX - minX) * (maxZ - minZ) * 0.08)}
        scale={[maxX - minX, 8, maxZ - minZ]}
        position={[centre[0], 4, centre[2]]}
        size={2.5}
        speed={0.3}
        color="#bdb3a8"
        opacity={0.6}
      />
    </group>
  );
}

/** Dry earth split by cracks, patches of ash and scorch (tiled across the ground). */
const paintCrackedEarth: Painter = (context, size, random) => {
  context.fillStyle = "#6e5a48";
  context.fillRect(0, 0, size, size);
  for (let index = 0; index < 160; index++) {
    const [x, y, r] = [random() * size, random() * size, 12 + random() * 40];
    const patch = context.createRadialGradient(x, y, 0, x, y, r);
    patch.addColorStop(0, random() < 0.5 ? "rgba(40,32,28,0.35)" : "rgba(150,130,110,0.25)");
    patch.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = patch;
    context.fillRect(x - r, y - r, r * 2, r * 2);
  }
  context.lineCap = "round";
  for (let crack = 0; crack < 40; crack++) {
    let [x, y] = [random() * size, random() * size];
    context.strokeStyle = "rgba(30,22,18,0.6)";
    context.lineWidth = 1 + random() * 2;
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 5; step++) {
      x += (random() - 0.5) * 60;
      y += (random() - 0.5) * 60;
      context.lineTo(x, y);
    }
    context.stroke();
  }
};
