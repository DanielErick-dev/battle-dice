"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  MeshStandardMaterial,
  SpriteMaterial,
  SRGBColorSpace,
  type Sprite,
} from "three";
import { drawParchment, pageStrokes } from "@/features/match/scene/character/shared/parchment";
import { useSoftDisc } from "@/features/match/scene/character/shared/softDisc";
import { withDressing, type GroundDressing } from "./groundDressing";
import { GROUND_RADIUS } from "./sceneryKit";
import { useCanvasTexture, type Painter } from "./textures";

const CANDLES = [
  { x: -0.74, z: -0.3, height: 0.16 },
  { x: -0.66, z: -0.42, height: 0.09 },
  { x: -0.3, z: -0.78, height: 0.13 },
  { x: 0.22, z: -0.8, height: 0.08 },
  { x: 0.32, z: -0.74, height: 0.15 },
  { x: 0.72, z: -0.36, height: 0.11 },
  { x: -0.82, z: 0.2, height: 0.07 },
  { x: 0.8, z: 0.24, height: 0.12 },
];
const CANDLE_RADIUS = 0.022;
/** `page` picks one of the written page textures. */
const PAGES = [
  { x: -0.42, z: 0.5, turn: 0.5, page: 0 },
  { x: 0.48, z: 0.42, turn: -0.3, page: 1 },
  { x: -0.6, z: -0.08, turn: 1.9, page: 2 },
  { x: 0.1, z: -0.55, turn: -0.9, page: 0 },
  { x: 0.62, z: -0.05, turn: 2.6, page: 2 },
];
const PAGE_SIZE: [number, number] = [0.13, 0.18];
/** Each book's leather, bottom up. */
const STACKS = [
  { x: -0.52, z: -0.6, turn: 0.4, books: ["#3b1418", "#2a2017", "#4a2a12"] },
  { x: 0.6, z: -0.58, turn: -0.5, books: ["#1f1a2b", "#3b1418"] },
];
const FLAME = new Color("#ffb054").multiplyScalar(2.2);
const HALO = new Color("#ff9a3d");

/** The Flesh Scribe's stage instead of the rune pedestal (origin on the floor); flames are sprites, not lights. */
export function Scriptorium() {
  const floor = useCanvasTexture({ size: 512, draw: paintScriptoriumFloor, seed: 19, fadeFrom: 0.5 });
  const pages = useStrewnPages();
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: floor, transparent: true, roughness: 0.95, depthWrite: false }),
      wax: new MeshStandardMaterial({ color: "#d9cfb4", roughness: 0.6 }),
      wick: new MeshStandardMaterial({ color: "#1a1410" }),
      pages: pages.map((map) => new MeshStandardMaterial({ map, roughness: 0.9 })),
      paper: new MeshStandardMaterial({ color: "#cdb98f", roughness: 0.9 }),
      flame: new SpriteMaterial({
        map: disc,
        color: FLAME,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      halo: new SpriteMaterial({
        map: disc,
        color: HALO,
        opacity: 0.12,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    }),
    [floor, pages, disc],
  );
  useEffect(
    () => () =>
      Object.values(materials)
        .flat()
        .forEach((material) => material.dispose()),
    [materials],
  );
  const flames = useRef<(Sprite | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    flames.current.forEach((flame, index) => {
      if (!flame) return;
      const flicker = 1 + 0.12 * Math.sin(t * 13 + index * 2.1) + 0.08 * Math.sin(t * 29 + index);
      flame.scale.set(0.03 * flicker, 0.06 * (2 - flicker), 1);
    });
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {CANDLES.map(({ x, z, height }, index) => (
        <group key={`${x}:${z}`} position={[x, 0, z]}>
          <mesh material={materials.wax} position-y={height / 2}>
            <cylinderGeometry args={[CANDLE_RADIUS * 0.92, CANDLE_RADIUS, height, 14]} />
          </mesh>
          {/* A ridge of wax that ran down and set. */}
          <mesh material={materials.wax} position={[CANDLE_RADIUS * 0.8, height * 0.7, 0]} scale={[0.5, 1.6, 0.5]}>
            <sphereGeometry args={[CANDLE_RADIUS * 0.4, 8, 6]} />
          </mesh>
          <mesh material={materials.wick} position-y={height + 0.008}>
            <cylinderGeometry args={[0.002, 0.002, 0.016, 4]} />
          </mesh>
          <sprite
            ref={(sprite) => {
              flames.current[index] = sprite;
            }}
            material={materials.flame}
            position-y={height + 0.035}
          />
          <sprite material={materials.halo} position-y={height + 0.03} scale={0.32} />
        </group>
      ))}
      {PAGES.map(({ x, z, turn, page }) => (
        <mesh
          key={`${x}:${z}`}
          material={materials.pages[page]}
          position={[x, 0.004, z]}
          rotation={[-Math.PI / 2 + 0.03, 0, turn]}
        >
          <planeGeometry args={PAGE_SIZE} />
        </mesh>
      ))}
      {STACKS.map(({ x, z, turn, books }) => (
        <group key={`${x}:${z}`} position={[x, 0, z]} rotation-y={turn}>
          {books.map((leather, index) => (
            <Book key={index} leather={leather} paper={materials.paper} level={index} />
          ))}
        </group>
      ))}
    </group>
  );
}

/** A book lying flat, `level` books up its stack, a little askew. */
function Book({ leather, paper, level }: { leather: string; paper: MeshStandardMaterial; level: number }) {
  const thickness = 0.034 - level * 0.004;
  const y = level * 0.034 + thickness / 2;
  return (
    <group position-y={y} rotation-y={(level % 2 ? 1 : -1) * 0.12 * level}>
      <mesh>
        <boxGeometry args={[0.2, thickness, 0.14]} />
        <meshStandardMaterial color={leather} roughness={0.7} />
      </mesh>
      {/* The page block, set in from the covers on three sides. */}
      <mesh material={paper} position-x={0.004}>
        <boxGeometry args={[0.192, thickness * 0.78, 0.143]} />
      </mesh>
    </group>
  );
}

/** Staggered slabs with dark joints and flecks, fading out towards the rim. */
const paintFlagstones: Painter = (context, size, random) => {
  context.fillStyle = "#16120f";
  context.fillRect(0, 0, size, size);
  const row = 74;
  for (let y = 0; y < size; y += row) {
    const offset = (y / row) % 2 ? row * 0.6 : 0;
    for (let x = -offset; x < size;) {
      const width = row * (0.9 + random() * 0.9);
      const shade = 38 + random() * 22;
      context.fillStyle = `rgb(${shade + 4},${shade},${shade - 4})`;
      context.fillRect(x + 3, y + 3, width - 6, row - 6);
      x += width;
    }
  }
  for (let fleck = 0; fleck < 3200; fleck++) {
    context.fillStyle = random() < 0.5 ? "rgba(10,8,6,0.35)" : "rgba(90,84,74,0.25)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
};

function useStrewnPages(): CanvasTexture[] {
  const pages = useMemo(
    () =>
      [211, 223, 239].map((seed) => {
        const result = new CanvasTexture(drawParchment(128, 176, seed, pageStrokes(seed)));
        result.colorSpace = SRGBColorSpace;
        return result;
      }),
    [],
  );
  useEffect(() => () => pages.forEach((page) => page.dispose()), [pages]);
  return pages;
}

/** A crimson carpet with a gold trim between the desks, ink blots and torn pages. */
const SCRIPTORIUM_GROUND: GroundDressing = {
  wash: { colour: "#b91c1c", alpha: 0.25 },
  patches: { colours: ["rgba(10,6,20,0.55)"], count: 10, radius: [8, 22] },
  path: { kind: "runner", colour: "#5a1018", edge: "#b08a3a", width: [0.22, 0.22] },
  litter: [{ shape: "shard", colours: ["rgba(230,215,180,0.9)"], count: 30, size: 7 }],
};
const paintScriptoriumFloor = withDressing(paintFlagstones, SCRIPTORIUM_GROUND);
