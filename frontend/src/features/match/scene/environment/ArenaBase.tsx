"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, type Texture } from "three";
import { seededRandom } from "@/game/domain/random";

interface ArenaBaseProps {
  /** Tile grid extent the base must hold. */
  width: number;
  depth: number;
  /** Top of the lower tier, where the braziers stand. */
  lowerTop: number;
  /** How far below the lower top the base reaches (into the water). */
  lowerHeight: number;
}

const TRIM_COLOR = "#f59e0b";
/** Stone texture tiles every this many world units. */
const BLOCK_UNITS = 2.4;

/**
 * Two-tier stone arena: an upper slab under the tiles and a wider lower tier rising
 * from the water, each edged with a glowing gold trim.
 */
export function ArenaBase({ width, depth, lowerTop, lowerHeight }: ArenaBaseProps) {
  const upper = { width: width + 1.4, depth: depth + 1.4, height: 0.5, y: -0.38 };
  const lower = { width: width + 3.6, depth: depth + 3.6, height: lowerHeight, y: lowerTop - lowerHeight / 2 };
  const stone = useStoneTexture();
  const upperMaterials = useSlabMaterials(stone, upper, "#8b8aa3");
  const lowerMaterials = useSlabMaterials(stone, lower, "#6f6d86");

  return (
    <group>
      <mesh position-y={upper.y} material={upperMaterials} receiveShadow castShadow>
        <boxGeometry args={[upper.width, upper.height, upper.depth]} />
      </mesh>
      <EdgeTrim width={upper.width} depth={upper.depth} y={upper.y + upper.height / 2} />

      <mesh position-y={lower.y} material={lowerMaterials} receiveShadow>
        <boxGeometry args={[lower.width, lower.height, lower.depth]} />
      </mesh>
      <EdgeTrim width={lower.width} depth={lower.depth} y={lowerTop} />
    </group>
  );
}

interface SlabSize {
  width: number;
  height: number;
  depth: number;
}

/**
 * One material per box face (+x, -x, +y, -y, +z, -z), each repeating the stone texture
 * by that face's own size so blocks keep a constant scale instead of stretching.
 */
function useSlabMaterials(stone: Texture, { width, height, depth }: SlabSize, color: string): MeshStandardMaterial[] {
  const materials = useMemo(() => {
    const faces: [number, number][] = [
      [depth, height],
      [depth, height],
      [width, depth],
      [width, depth],
      [width, height],
      [width, height],
    ];
    return faces.map(([u, v]) => {
      const map = stone.clone();
      map.repeat.set(u / BLOCK_UNITS, v / BLOCK_UNITS);
      map.needsUpdate = true;
      return new MeshStandardMaterial({ map, color, roughness: 0.92, metalness: 0.05 });
    });
  }, [stone, width, height, depth, color]);

  useEffect(
    () => () =>
      materials.forEach((material) => {
        material.map?.dispose();
        material.dispose();
      }),
    [materials],
  );
  return materials;
}

/** Thin glowing strip around the top edge of a slab. */
function EdgeTrim({ width, depth, y }: { width: number; depth: number; y: number }) {
  const thickness = 0.07;
  const sides: [number, number, number, number][] = [
    [0, depth / 2, width, thickness],
    [0, -depth / 2, width, thickness],
    [width / 2, 0, thickness, depth],
    [-width / 2, 0, thickness, depth],
  ];

  return (
    <group position-y={y + 0.01}>
      {sides.map(([x, z, sizeX, sizeZ]) => (
        <mesh key={`${x}:${z}`} position={[x, 0, z]}>
          <boxGeometry args={[sizeX, 0.05, sizeZ]} />
          <meshStandardMaterial color={TRIM_COLOR} emissive={TRIM_COLOR} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

const TEXTURE_SIZE = 512;

/** Square stone blocks with mortar lines and grain; faces clone it with their own repeat. */
function useStoneTexture(): CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    const ctx = canvas.getContext("2d");
    if (ctx) paintBlocks(ctx);

    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    result.wrapS = RepeatWrapping;
    result.wrapT = RepeatWrapping;
    result.anisotropy = 8;
    return result;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function paintBlocks(ctx: CanvasRenderingContext2D) {
  const random = seededRandom(42);
  const blocks = 2;
  const cell = TEXTURE_SIZE / blocks;

  for (let row = 0; row < blocks; row++) {
    for (let column = 0; column < blocks; column++) {
      const shade = 150 + Math.floor(random() * 40);
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 8})`;
      ctx.fillRect(column * cell, row * cell, cell, cell);
    }
  }

  for (let i = 0; i < 6000; i++) {
    const value = random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${value},${value},${value},${0.03 + random() * 0.07})`;
    const size = 1 + random() * 3;
    ctx.fillRect(random() * TEXTURE_SIZE, random() * TEXTURE_SIZE, size, size);
  }

  ctx.strokeStyle = "rgba(20, 18, 30, 0.85)";
  ctx.lineWidth = 6;
  for (let i = 0; i <= blocks; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, TEXTURE_SIZE);
    ctx.moveTo(0, i * cell);
    ctx.lineTo(TEXTURE_SIZE, i * cell);
    ctx.stroke();
  }
}
