"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  InstancedBufferAttribute,
  type InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from "three";
import { TILE_HEIGHT, type Vec3 } from "@/features/shared/board/boardLayout";
import type { SlabOutline } from "@/features/shared/board/slab";
import type { Tile } from "@/game/domain/types";
import { CENTER, FONT, RUNE } from "./face/canvas";
import { runePath } from "./face/rune";
import type { TileTheme } from "./theme/tileTheme";

/** The plaque's size in world units (a tile is 2 wide), and one plaque's cell on the shared canvas in pixels. */
const PLAQUE = { width: 0.62, height: 0.4 };
const CELL = { width: 160, height: 104 };
/** Plaques per row of the shared canvas: 16 × 160 px keeps it within 2560 px wide. */
const ATLAS_COLUMNS = 16;
/** Stood just past the slab's front kerb, a little above the walkway so the grass on it never hides the number. */
const OUT_PAST_EDGE = 0.16;
const ABOVE_WALKWAY = 0.32;
/** Leaned back towards the sky, so the camera looking down on the board reads it straight. */
const LEAN = -0.5;
/** Plaques turn again only once the camera has swung round by more than this (radians). */
const TURN_STEP = 0.004;

/**
 * Where the plaque stands: the middle of the side kerb nearer the camera (it looks from +z). The kerbs run along the
 * road, so plaques never line up between tiles where the road comes towards the camera; a square slab (no road
 * order) uses its front edge.
 */
export function plaqueEdge(outline: SlabOutline): { x: number; z: number; outX: number; outZ: number } {
  if (outline.length !== 4) return frontEdge(outline);
  // Corners go back-right, front-right, front-left, back-left: edges 0 and 2 are the kerbs.
  const kerbs = [0, 2].map((index) => {
    const [ax, az] = outline[index]!;
    const [bx, bz] = outline[index + 1]!;
    const [x, z] = [(ax + bx) / 2, (az + bz) / 2];
    const length = Math.hypot(x, z) || 1;
    return { x, z, outX: x / length, outZ: z / length };
  });
  const [right, left] = kerbs as [(typeof kerbs)[0], (typeof kerbs)[0]];
  // Nearer the camera; level (the road running towards it), the right-hand one.
  return left.z > right.z + 0.05 ? left : right;
}

/** The middle of the slab's edge nearest the camera (it looks from +z), and the way out of the slab there. */
export function frontEdge(outline: SlabOutline): { x: number; z: number; outX: number; outZ: number } {
  let best = { x: 0, z: -Infinity, outX: 0, outZ: 1 };
  outline.forEach(([ax, az], index) => {
    const [bx, bz] = outline[(index + 1) % outline.length]!;
    const [x, z] = [(ax + bx) / 2, (az + bz) / 2];
    if (z <= best.z) return;
    const length = Math.hypot(x, z) || 1;
    best = { x, z, outX: x / length, outZ: z / length };
  });
  return best;
}

const forward = new Vector3();

/** The way the camera looks, as a turn round the vertical (the board itself never turns). */
function cameraYaw(camera: { getWorldDirection(target: Vector3): Vector3 }): number {
  camera.getWorldDirection(forward);
  return Math.atan2(-forward.x, -forward.z);
}

/** One tile's number plaque: its text and ring colour, its tile's centre and slab, and its rune if it shows one. */
export interface NumberPlaque {
  text: string;
  accent: string;
  position: Vec3;
  outline: SlabOutline;
  /** A tile whose effect has no 3D ornament shows its rune on a round medallion over the number. */
  rune?: TileTheme;
}

/** Kinds whose 3D ornament (chest, portal, vines, chevrons, die, hourglass) already shows what they do. */
const ORNAMENTED: readonly Tile["effect"]["kind"][] = ["portal", "trap", "advance", "card", "extraTurn", "skipTurn"];

/** Whether a tile's plaque carries its rune on a medallion: special tiles without a 3D ornament. */
export function showsRune(tile: Tile, theme: TileTheme): boolean {
  return theme.kind !== "regular" && !ORNAMENTED.includes(tile.effect.kind);
}

/** How far over the number plaque's middle the medallion's middle sits, along the plaque's lean. */
const MEDALLION_ABOVE = PLAQUE.height + 0.06;
/** The rune's reach on the medallion, in canvas pixels (runes are drawn RUNE wide round CENTER, see face/rune). */
const MEDALLION_RUNE = 34;

/** One cell of the shared canvas: a number plaque, or a rune medallion. */
type Cell = { kind: "number"; text: string; accent: string } | { kind: "rune"; theme: TileTheme };

function cellsOf(plaques: readonly NumberPlaque[]): Cell[] {
  return plaques.flatMap(({ text, accent, rune }): Cell[] => [
    { kind: "number", text, accent },
    ...(rune ? [{ kind: "rune" as const, theme: rune }] : []),
  ]);
}

function paintMedallion(ctx: CanvasRenderingContext2D, left: number, top: number, theme: TileTheme) {
  const [cx, cy, radius] = [left + CELL.width / 2, top + CELL.height / 2, CELL.height / 2 - 6];
  ctx.save();
  ctx.fillStyle = "rgba(12,12,20,0.92)";
  ctx.strokeStyle = theme.glow;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.translate(cx, cy);
  ctx.scale(MEDALLION_RUNE / RUNE, MEDALLION_RUNE / RUNE);
  ctx.translate(-CENTER, -CENTER);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = theme.glow;
  ctx.fillStyle = theme.glow;
  ctx.lineWidth = 18;
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 6;
  runePath(ctx, { tileId: 0, theme, accent: theme.glow, arrowAngle: null, resolution: CELL.height });
  ctx.restore();
}

/** Every cell painted into one shared canvas (row by row, ATLAS_COLUMNS to a row). */
function paintAtlas(cells: readonly Cell[]): CanvasTexture {
  const rows = Math.max(1, Math.ceil(cells.length / ATLAS_COLUMNS));
  const canvas = document.createElement("canvas");
  canvas.width = CELL.width * ATLAS_COLUMNS;
  canvas.height = CELL.height * rows;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    cells.forEach((cell, index) => {
      const [left, top] = [(index % ATLAS_COLUMNS) * CELL.width, Math.floor(index / ATLAS_COLUMNS) * CELL.height];
      if (cell.kind === "rune") {
        paintMedallion(ctx, left, top, cell.theme);
        return;
      }
      const { text, accent } = cell;
      const inset = 6;
      ctx.fillStyle = "rgba(12,12,20,0.88)";
      ctx.strokeStyle = accent;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.roundRect(left + inset, top + inset, CELL.width - inset * 2, CELL.height - inset * 2, 22);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${text.length > 2 ? 58 : 70}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, left + CELL.width / 2, top + CELL.height / 2 + 4, CELL.width - 30);
    });
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Every tile's number on a small plaque at its kerb facing the camera, all in one draw: one mesh drawn once per
 * plaque, each showing its own cell of a shared canvas; they turn with the camera only when it swings round.
 */
export function TileNumbers({ plaques }: { plaques: readonly NumberPlaque[] }) {
  const key = plaques
    .map(({ text, accent, rune }) => `${text}${accent}${rune?.kind ?? ""}${rune?.label ?? ""}`)
    .join(",");
  const cells = useMemo(
    () => cellsOf(plaques),
    // The key stands for the plaques' looks; their spots never change under a board.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  const atlas = useMemo(() => paintAtlas(cells), [cells]);
  useEffect(() => () => atlas.dispose(), [atlas]);
  const rows = Math.max(1, Math.ceil(cells.length / ATLAS_COLUMNS));
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(PLAQUE.width, PLAQUE.height);
    const offsets = new Float32Array(cells.length * 2);
    cells.forEach((_, index) => {
      offsets[index * 2] = (index % ATLAS_COLUMNS) / ATLAS_COLUMNS;
      // The canvas is flipped onto the texture: its top row is the top of the texture.
      offsets[index * 2 + 1] = 1 - (Math.floor(index / ATLAS_COLUMNS) + 1) / rows;
    });
    plane.setAttribute("cell", new InstancedBufferAttribute(offsets, 2));
    return plane;
  }, [cells, rows]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useMemo(() => {
    // Cut out, not blended: drawn with the solid objects, it never flickers in and out of sorting.
    const plaque = new MeshBasicMaterial({ map: atlas, alphaTest: 0.5, toneMapped: false });
    plaque.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute vec2 cell;")
        .replace(
          "#include <uv_vertex>",
          `#include <uv_vertex>
          vMapUv = cell + uv * vec2(${(1 / ATLAS_COLUMNS).toFixed(6)}, ${(1 / rows).toFixed(6)});`,
        );
    };
    plaque.customProgramCacheKey = () => `plaques${rows}`;
    return plaque;
  }, [atlas, rows]);
  useEffect(() => () => material.dispose(), [material]);
  const mesh = useRef<InstancedMesh>(null);
  const shownYaw = useRef<number | null>(null);
  // One spot per cell, in the same order: a medallion goes over its number plaque (raise > 0).
  const spots = useMemo(
    () =>
      plaques.flatMap(({ position: [x, y, z], outline, rune }) => {
        const edge = plaqueEdge(outline);
        const at = new Vector3(
          x + edge.x + edge.outX * OUT_PAST_EDGE,
          y + TILE_HEIGHT / 2 + ABOVE_WALKWAY,
          z + edge.z + edge.outZ * OUT_PAST_EDGE,
        );
        return rune
          ? [
              { at, raise: 0 },
              { at, raise: MEDALLION_ABOVE },
            ]
          : [{ at, raise: 0 }];
      }),
    [plaques],
  );
  const place = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    shownYaw.current = null;
  }, [spots, geometry]);
  useFrame(({ camera }) => {
    const current = mesh.current;
    if (!current) return;
    const yaw = cameraYaw(camera);
    if (shownYaw.current !== null && Math.abs(yaw - shownYaw.current) <= TURN_STEP) return;
    shownYaw.current = yaw;
    spots.forEach(({ at, raise }, index) => {
      place.position.copy(at);
      place.rotation.set(LEAN, yaw, 0, "YXZ");
      place.translateY(raise);
      place.updateMatrix();
      current.setMatrixAt(index, place.matrix);
    });
    current.instanceMatrix.needsUpdate = true;
    current.computeBoundingSphere();
  });
  if (cells.length === 0) return null;
  return <instancedMesh key={cells.length} ref={mesh} args={[geometry, material, cells.length]} />;
}
