"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BackSide, Color, PlaneGeometry, SpriteMaterial, type Sprite } from "three";
import { useCanvasTexture, type Painter } from "@/features/menu/stage/scenery/kit/textures";
import type { Vec3 } from "../boardLayout";
import { useSoftDisc } from "../character/shared/softDisc";
import { planDungeon } from "./dungeon";
import { TRAIL_GROUND } from "./islandTerrain";
import { KitPieces } from "./kits";
import { paintFlagstoneRoad, TrailRoad } from "./road";

/** World units per repeat of the floor's flagstones. */
const FLOOR_REPEAT = 6;
const FLAME = new Color("#ffae4a").multiplyScalar(2.2);

/**
 * The dungeon map: a vast flagstoned hall under a dark vault, walls on three sides lit by torches,
 * pillars, barrels, crates and treasure between the rows, and dust in the air.
 */
export function Dungeon({ trail }: { trail: readonly Vec3[] }) {
  const plan = useMemo(() => planDungeon(trail), [trail]);
  const { minX, maxX, minZ, maxZ } = plan.bounds;
  const [width, depth] = [maxX - minX, maxZ - minZ];
  const floor = useCanvasTexture({ size: 512, draw: paintHallFloor, seed: 5, tile: true });
  // The flagstones repeat every FLOOR_REPEAT units: the plane's UVs run past 1 to tile them.
  const floorGeometry = useMemo(() => {
    const plane = new PlaneGeometry(width + 8, depth + 8);
    const uv = plane.getAttribute("uv");
    for (let index = 0; index < uv.count; index++) {
      uv.setXY(index, (uv.getX(index) * (width + 8)) / FLOOR_REPEAT, (uv.getY(index) * (depth + 8)) / FLOOR_REPEAT);
    }
    return plane;
  }, [width, depth]);
  useEffect(() => () => floorGeometry.dispose(), [floorGeometry]);

  return (
    <group>
      {/* The vault: everything beyond the walls is dark. */}
      <mesh position={[(minX + maxX) / 2, 0, (minZ + maxZ) / 2]}>
        <sphereGeometry args={[Math.max(width, depth) * 1.6, 24, 16]} />
        <meshBasicMaterial color="#07050b" side={BackSide} fog={false} />
      </mesh>
      <mesh
        geometry={floorGeometry}
        rotation-x={-Math.PI / 2}
        position={[(minX + maxX) / 2, TRAIL_GROUND, (minZ + maxZ) / 2]}
        receiveShadow
      >
        <meshStandardMaterial map={floor} roughness={0.9} color="#7a7682" />
      </mesh>
      <TrailRoad trail={trail} heightAt={() => TRAIL_GROUND} paint={paintFlagstoneRoad} />
      <KitPieces kit="dungeon" items={plan.pieces} />
      <Flames flames={plan.flames} />
      <Sparkles
        count={Math.round(width * depth * 0.05)}
        scale={[width, 5, depth]}
        position={[(minX + maxX) / 2, 2.5, (minZ + maxZ) / 2]}
        size={2}
        speed={0.15}
        color="#c9b89a"
        opacity={0.5}
      />
    </group>
  );
}

/** Torch and candle flames: soft glows flickering out of step, bright enough to bloom. */
export function Flames({ flames }: { flames: readonly Vec3[] }) {
  const disc = useSoftDisc();
  const materials = useMemo(
    () =>
      flames.map(
        () =>
          new SpriteMaterial({
            map: disc,
            color: FLAME,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
            toneMapped: false,
          }),
      ),
    [disc, flames],
  );
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);
  const sprites = useRef<(Sprite | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    sprites.current.forEach((sprite, index) => {
      if (!sprite) return;
      const flicker = 1 + 0.15 * Math.sin(t * 11 + index * 1.7) + 0.1 * Math.sin(t * 23 + index);
      sprite.scale.setScalar(0.9 * flicker);
      materials[index].opacity = 0.7 + 0.2 * Math.sin(t * 17 + index * 2.3);
    });
  });
  return flames.map((position, index) => (
    <sprite
      key={index}
      ref={(sprite) => {
        sprites.current[index] = sprite;
      }}
      position={position}
      material={materials[index]}
    />
  ));
}

/** Big worn flagstones in rows, dark joints and grime (tiled across the hall's floor). */
const paintHallFloor: Painter = (context, size, random) => {
  context.fillStyle = "#2b2830";
  context.fillRect(0, 0, size, size);
  const rows = 6;
  for (let row = 0; row < rows; row++) {
    const y = (row / rows) * size;
    const height = size / rows;
    let x = -random() * 60;
    while (x < size) {
      const width = 60 + random() * 70;
      const shade = 58 + Math.floor(random() * 30);
      context.fillStyle = `rgb(${shade},${shade - 3},${shade + 5})`;
      context.fillRect(x + 3, y + 3, width - 6, height - 6);
      x += width;
    }
  }
  for (let index = 0; index < 90; index++) {
    const [x, y, r] = [random() * size, random() * size, 10 + random() * 30];
    const grime = context.createRadialGradient(x, y, 0, x, y, r);
    grime.addColorStop(0, "rgba(14,12,10,0.35)");
    grime.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = grime;
    context.fillRect(x - r, y - r, r * 2, r * 2);
  }
};
