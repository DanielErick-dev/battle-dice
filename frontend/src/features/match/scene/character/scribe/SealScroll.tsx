"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import { seededRandom } from "@/game/domain/core/random";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../../boardLayout";
import { useAge } from "../../useAge";
import { EFFECT_SCALE } from "../core/figure";
import { NameTag } from "../shared/NameTag";
import { BLOOD_INK } from "../shared/parchment";

const TILE_TOP = TILE_HEIGHT / 2;
/** The page of skin: its size, how high it hangs over the tile and how much it sways. */
const PAGE_WIDTH = TILE_SIZE * 0.34;
const PAGE_HEIGHT = TILE_SIZE * 0.42;
const PAGE_HEIGHT_ABOVE = 0.62;
const SWAY = 0.05;
/** Radians per second the page turns, so it's seen from every side of the board. */
const TURN_RATE = 0.35;
/** The bone claws holding it: how many, how far out they rise from, how tall they curl. */
const CLAWS = 4;
const CLAW_BASE = TILE_SIZE * 0.3;
const CLAW_HEIGHT = 0.95;
/** Blood dripping from the page into the pool: drops, and seconds for one to fall. */
const DROPS = 3;
const DROP_SECONDS = 1.3;

const BONE = "#e3d6bd";

/**
 * A forbidden seal on its tile, the same for every kind so nobody but its writer knows which it
 * is: a page of stitched skin bearing an eye written in blood, held up over a pool of blood by
 * bone claws curling out of the tile, breathing slowly and dripping. The eye smoulders faintly in
 * its writer's colour. Its writer alone also sees its name (`label`). Snaps in as it's written.
 */
export function SealScroll({ position, color, label }: { position: Vec3; color: string; label?: string }) {
  const root = useRef<Group>(null);
  const page = useRef<Group>(null);
  const drops = useRef<(Mesh | null)[]>([]);
  const skin = useSkinPage();
  const pool = useBloodPool();
  const age = useAge();
  // Seals written together shouldn't breathe in step.
  const phase = useMemo(() => (position[0] * 3.1 + position[2] * 1.7) % (Math.PI * 2), [position]);

  const materials = useMemo(
    () => ({
      page: new MeshStandardMaterial({
        map: skin,
        emissiveMap: skin,
        emissive: new Color(color).multiplyScalar(0.25),
        roughness: 0.7,
        side: DoubleSide,
        transparent: true,
        alphaTest: 0.1,
      }),
      bone: new MeshStandardMaterial({ color: BONE, roughness: 0.75 }),
      blood: new MeshStandardMaterial({
        color: "#3d0306",
        roughness: 0.15,
        metalness: 0.1,
      }),
      pool: new MeshStandardMaterial({
        map: pool,
        transparent: true,
        roughness: 0.12,
        metalness: 0.15,
        depthWrite: false,
      }),
    }),
    [skin, pool, color],
  );
  const claws = useMemo(() => {
    const random = seededRandom(Math.round(position[0] * 13 + position[2] * 7));
    return Array.from({ length: CLAWS }, (_, index) => {
      const angle = (index / CLAWS) * Math.PI * 2 + Math.PI / 4 + (random() - 0.5) * 0.3;
      const out = new Vector3(Math.cos(angle), 0, Math.sin(angle));
      const height = CLAW_HEIGHT * (0.85 + random() * 0.3);
      // Out of the tile, bowing outwards, then hooking back in over the page: a rib of a cage.
      const curve = new CatmullRomCurve3([
        out.clone().multiplyScalar(CLAW_BASE),
        out
          .clone()
          .multiplyScalar(CLAW_BASE * 1.25)
          .setY(height * 0.4),
        out
          .clone()
          .multiplyScalar(CLAW_BASE * 0.95)
          .setY(height * 0.8),
        out
          .clone()
          .multiplyScalar(CLAW_BASE * 0.45)
          .setY(height),
      ]);
      return new TubeGeometry(curve, 16, 0.035, 6, false);
    });
  }, [position]);
  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
      claws.forEach((claw) => claw.dispose());
    },
    [materials, claws],
  );

  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime;
    root.current?.scale.setScalar(Math.min(1, 0.3 + age(now) * 3));
    if (page.current) {
      page.current.position.y = PAGE_HEIGHT_ABOVE + Math.sin(now * 1.1 + phase) * SWAY;
      page.current.rotation.y += delta * TURN_RATE;
      // Breathing: the skin swells and sinks.
      const breath = 1 + Math.sin(now * 1.6 + phase) * 0.04;
      page.current.scale.set(breath, 1 / breath, 1);
    }
    drops.current.forEach((drop, index) => {
      if (!drop) return;
      const fall = ((now + phase) / DROP_SECONDS + index / DROPS) % 1;
      drop.position.y = PAGE_HEIGHT_ABOVE - PAGE_HEIGHT / 2 - fall ** 2 * (PAGE_HEIGHT_ABOVE - PAGE_HEIGHT / 2);
      drop.scale.set(1, 1 + fall * 1.5, 1);
    });
  });

  return (
    <group ref={root} position={[position[0], position[1] + TILE_TOP, position[2]]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.012} material={materials.pool} receiveShadow>
        <planeGeometry args={[TILE_SIZE * 0.72, TILE_SIZE * 0.72]} />
      </mesh>
      {claws.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={materials.bone} castShadow />
      ))}
      <group ref={page}>
        <mesh material={materials.page} castShadow>
          <planeGeometry args={[PAGE_WIDTH, PAGE_HEIGHT, 6, 8]} />
        </mesh>
      </group>
      {Array.from({ length: DROPS }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            drops.current[index] = mesh;
          }}
          material={materials.blood}
          position-x={(index - 1) * PAGE_WIDTH * 0.22}
        >
          <sphereGeometry args={[0.022, 8, 8]} />
        </mesh>
      ))}
      {/* For its writer's eyes only: which seal it is. */}
      {label && <NameTag text={label} color="#fca5a5" y={PAGE_HEIGHT_ABOVE + 0.55} size={EFFECT_SCALE} />}
    </group>
  );
}

/**
 * The page: tanned, mottled skin with ragged edges, stitched together down the middle and
 * along the sides, veined, with an eye written in blood in the middle, its ink running.
 */
function useSkinPage(): CanvasTexture {
  const texture = useMemo(() => {
    const width = 192;
    const height = 240;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d")!;
    const random = seededRandom(29);

    // A ragged outline, cut from a hide.
    context.beginPath();
    const points = 28;
    for (let index = 0; index <= points; index++) {
      const t = index / points;
      const edge = (side: number) => 8 + random() * 10 * side;
      const [x, y] =
        t < 0.25
          ? [t * 4 * width, edge(1)]
          : t < 0.5
            ? [width - edge(1), (t - 0.25) * 4 * height]
            : t < 0.75
              ? [width - (t - 0.5) * 4 * width, height - edge(1)]
              : [edge(1), height - (t - 0.75) * 4 * height];
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    const hide = context.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, width * 0.75);
    hide.addColorStop(0, "#c99282");
    hide.addColorStop(0.6, "#a46a5c");
    hide.addColorStop(1, "#5e3029");
    context.fillStyle = hide;
    context.fill();
    context.save();
    context.clip();
    // Mottling and bruises.
    for (let blot = 0; blot < 40; blot++) {
      context.fillStyle = `rgba(${random() < 0.5 ? "90,30,35" : "200,150,130"},${0.08 + random() * 0.12})`;
      context.beginPath();
      context.arc(random() * width, random() * height, 4 + random() * 16, 0, Math.PI * 2);
      context.fill();
    }
    // Veins.
    context.strokeStyle = "rgba(80,10,25,0.45)";
    context.lineWidth = 1.2;
    for (let vein = 0; vein < 7; vein++) {
      let x = random() * width;
      let y = random() * height;
      context.beginPath();
      context.moveTo(x, y);
      for (let step = 0; step < 6; step++) {
        x += (random() - 0.5) * 40;
        y += (random() - 0.5) * 40;
        context.lineTo(x, y);
      }
      context.stroke();
    }
    context.restore();

    // Stitches: a seam down the middle and along each side.
    context.strokeStyle = "#2a1410";
    context.lineWidth = 2;
    const seam = (x: number) => {
      for (let y = 24; y < height - 24; y += 14) {
        context.beginPath();
        context.moveTo(x - 6, y);
        context.lineTo(x + 6, y + 7);
        context.moveTo(x + 6, y);
        context.lineTo(x - 6, y + 7);
        context.stroke();
      }
    };
    seam(width * 0.12);
    seam(width * 0.88);

    // The eye, in blood: almond lids, an iris and a slit pupil, rays around it, ink running down.
    const cx = width / 2;
    const cy = height * 0.46;
    context.strokeStyle = BLOOD_INK;
    context.fillStyle = BLOOD_INK;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(cx - 58, cy);
    context.quadraticCurveTo(cx, cy - 46, cx + 58, cy);
    context.quadraticCurveTo(cx, cy + 46, cx - 58, cy);
    context.stroke();
    context.lineWidth = 4;
    context.beginPath();
    context.arc(cx, cy, 18, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.ellipse(cx, cy, 4, 14, 0, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 2.5;
    for (let ray = 0; ray < 9; ray++) {
      const angle = Math.PI + (ray / 8) * Math.PI;
      context.beginPath();
      context.moveTo(cx + Math.cos(angle) * 44, cy + Math.sin(angle) * 34);
      context.lineTo(cx + Math.cos(angle) * 64, cy + Math.sin(angle) * 52);
      context.stroke();
    }
    for (let run = 0; run < 5; run++) {
      const x = cx - 40 + run * 20 + (random() - 0.5) * 8;
      const length = 20 + random() * 60;
      context.lineWidth = 2 + random() * 2.5;
      context.beginPath();
      context.moveTo(x, cy + 24);
      context.lineTo(x + (random() - 0.5) * 4, cy + 24 + length);
      context.stroke();
      context.beginPath();
      context.arc(x, cy + 24 + length, context.lineWidth * 0.9, 0, Math.PI * 2);
      context.fill();
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** A pool of dark blood with an uneven edge and a few splashes around it, on transparent. */
function useBloodPool(): CanvasTexture {
  const texture = useMemo(() => {
    const size = 256;
    const centre = size / 2;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    const random = seededRandom(41);
    context.fillStyle = "#4a0509";
    context.beginPath();
    const lobes = 22;
    for (let index = 0; index <= lobes; index++) {
      const angle = (index / lobes) * Math.PI * 2;
      const radius = size * (0.26 + random() * 0.1);
      const [x, y] = [centre + Math.cos(angle) * radius, centre + Math.sin(angle) * radius];
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
    for (let splash = 0; splash < 14; splash++) {
      const angle = random() * Math.PI * 2;
      const distance = size * (0.36 + random() * 0.1);
      context.beginPath();
      context.arc(
        centre + Math.cos(angle) * distance,
        centre + Math.sin(angle) * distance,
        2 + random() * 6,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    // A darker, thicker middle.
    const depth = context.createRadialGradient(centre, centre, 0, centre, centre, size * 0.3);
    depth.addColorStop(0, "rgba(20,0,2,0.7)");
    depth.addColorStop(1, "rgba(20,0,2,0)");
    context.globalCompositeOperation = "source-atop";
    context.fillStyle = depth;
    context.fillRect(0, 0, size, size);
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
