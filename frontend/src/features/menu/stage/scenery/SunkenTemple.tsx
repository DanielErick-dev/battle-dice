"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
  type InstancedMesh,
  type Mesh,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom, type RandomSource } from "@/game/domain/random";
import { useCanvasTexture, useNoiseTexture, type CanvasLook, type NoiseLook } from "./textures";

const FLOOR_RADIUS = 1;
/** Branching coral: `size` scales the whole tree. */
const CORALS = [
  { x: -0.64, z: -0.5, size: 0.34, color: "#ff6b4a", seed: 3 },
  { x: 0.6, z: -0.6, size: 0.3, color: "#f472b6", seed: 8 },
  { x: 0.8, z: -0.12, size: 0.18, color: "#a78bfa", seed: 12 },
  { x: -0.8, z: 0.18, size: 0.14, color: "#fb923c", seed: 21 },
];
const FRONDS = [
  { x: -0.84, z: -0.14, height: 0.42, phase: 0 },
  { x: -0.48, z: -0.74, height: 0.55, phase: 1.3 },
  { x: -0.4, z: -0.68, height: 0.36, phase: 2.1 },
  { x: 0.1, z: -0.92, height: 0.6, phase: 0.6 },
  { x: 0.42, z: -0.82, height: 0.46, phase: 2.8 },
  { x: 0.74, z: -0.38, height: 0.34, phase: 1.9 },
  { x: -0.7, z: 0.4, height: 0.18, phase: 3.4 },
  { x: 0.7, z: 0.36, height: 0.2, phase: 4.2 },
];
const FROND_SEGMENTS = 8;
const COLUMN_RADIUS = 0.075;
const COINS = 16;
const BUBBLES = 40;
const BUBBLE_HEIGHT = 1.9;
/** Where bubbles rise from: the corals' feet and cracks between the tiles. */
const VENTS = [
  [-0.64, -0.5],
  [0.6, -0.6],
  [0.8, -0.12],
  [-0.2, -0.75],
  [0.3, -0.3],
  [-0.5, 0.05],
] as const;
const RAYS = 4;

/**
 * Auric's stage instead of the rune pedestal: the gold-inlaid floor of a sunken temple, coral and swaying
 * weed, a toppled golden column, coins, caustics rippling over the tiles and bubbles rising. Origin on the floor.
 */
export function SunkenTemple() {
  const tiles = useCanvasTexture(TILES);
  const causticsA = useCanvasTexture(CAUSTICS);
  const causticsB = useCanvasTexture(CAUSTICS);
  const mask = useCanvasTexture(MASK);
  const gilt = useNoiseTexture(GILT);
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: tiles, transparent: true, roughness: 0.75, depthWrite: false }),
      gold: new MeshStandardMaterial({
        map: gilt,
        metalness: 0.85,
        roughness: 0.35,
        emissive: "#5c3d08",
        emissiveIntensity: 0.35,
        flatShading: true,
      }),
      weed: new MeshStandardMaterial({ color: "#2f7d4f", roughness: 0.8, side: DoubleSide }),
      darkWeed: new MeshStandardMaterial({ color: "#1d5a44", roughness: 0.8, side: DoubleSide }),
      brain: new MeshStandardMaterial({ color: "#d9a066", roughness: 0.9 }),
      caustics: [causticsA, causticsB].map(
        (map) =>
          new MeshBasicMaterial({
            map,
            alphaMap: mask,
            color: "#7fe9f5",
            opacity: 0.55,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    }),
    [tiles, gilt, causticsA, causticsB, mask],
  );
  useEffect(
    () => () =>
      Object.values(materials)
        .flat()
        .forEach((material) => material.dispose()),
    [materials],
  );
  const corals = useMemo(() => CORALS.map(({ seed }) => branchingCoral(seededRandom(seed))), []);
  useEffect(() => () => corals.forEach((geometry) => geometry.dispose()), [corals]);
  const brain = useMemo(() => brainCoral(), []);
  useEffect(() => () => brain.dispose(), [brain]);

  const caustics = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Two layers drifting across each other make the net of light shift and break.
    causticsA.repeat.set(1.6, 1.6);
    causticsA.offset.set(t * 0.018, t * 0.011);
    causticsB.repeat.set(2.1, 2.1);
    causticsB.offset.set(-t * 0.013, t * 0.02);
    const pulse = caustics.current[0];
    if (pulse) (pulse.material as MeshBasicMaterial).opacity = 0.45 + 0.15 * Math.sin(t * 0.7);
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[FLOOR_RADIUS, 64]} />
      </mesh>
      {materials.caustics.map((material, index) => (
        <mesh
          key={index}
          ref={(mesh) => void (caustics.current[index] = mesh)}
          material={material}
          rotation-x={-Math.PI / 2}
          position-y={0.004 + index * 0.001}
          renderOrder={1}
        >
          <circleGeometry args={[FLOOR_RADIUS * 0.95, 64]} />
        </mesh>
      ))}
      <ToppledColumn gold={materials.gold} />
      {CORALS.map(({ x, z, size, color }, index) => (
        <mesh key={`${x}:${z}`} geometry={corals[index]} position={[x, 0, z]} rotation-y={index * 1.7} scale={size}>
          <meshStandardMaterial color={color} roughness={0.85} emissive={color} emissiveIntensity={0.12} />
        </mesh>
      ))}
      <mesh geometry={brain} material={materials.brain} position={[-0.48, -0.02, -0.3]} scale={[0.08, 0.055, 0.07]} />
      <mesh geometry={brain} material={materials.brain} position={[0.86, -0.02, 0.06]} scale={[0.06, 0.04, 0.055]} />
      <SeaFan />
      <Seaweed weed={materials.weed} darkWeed={materials.darkWeed} />
      <Coins gold={materials.gold} />
      <Bubbles />
      <SunShafts />
    </group>
  );
}

/** A column toppled across the back, broken in two, beside its standing stump and a fallen capital. */
function ToppledColumn({ gold }: { gold: MeshStandardMaterial }) {
  const r = COLUMN_RADIUS;
  return (
    <group>
      <group position={[0.1, r * 0.9, -0.66]} rotation-y={-0.32}>
        <mesh material={gold} position-x={-0.2} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[r, r, 0.42, 16]} />
        </mesh>
        <mesh material={gold} position={[0.2, -0.01, 0.03]} rotation={[0.1, 0.15, Math.PI / 2 + 0.06]}>
          <cylinderGeometry args={[r, r, 0.28, 16]} />
        </mesh>
        {/* The bands where the drums met. */}
        {[-0.41, 0.01, 0.34].map((x) => (
          <mesh key={x} material={gold} position-x={x} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[r * 1.12, r * 1.12, 0.025, 16]} />
          </mesh>
        ))}
      </group>
      <group position={[-0.3, 0, -0.86]}>
        <mesh material={gold} position-y={0.03}>
          <boxGeometry args={[r * 3, 0.06, r * 3]} />
        </mesh>
        <mesh material={gold} position-y={0.06 + 0.17}>
          <cylinderGeometry args={[r * 0.95, r, 0.34, 16]} />
        </mesh>
      </group>
      <mesh material={gold} position={[0.52, 0.035, -0.4]} rotation={[0.12, 0.6, 0.2]}>
        <cylinderGeometry args={[r * 1.6, r * 1.05, 0.07, 16]} />
      </mesh>
    </group>
  );
}

/** Gold coins spilled around the column's foot. */
function Coins({ gold }: { gold: MeshStandardMaterial }) {
  const coins = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = coins.current;
    if (!mesh) return;
    const random = seededRandom(51);
    const dummy = new Object3D();
    for (let index = 0; index < COINS; index++) {
      const angle = -Math.PI * (0.2 + random() * 0.6);
      const distance = 0.45 + random() * 0.35;
      dummy.position.set(Math.cos(angle) * distance, 0.004 + random() * 0.004, Math.sin(angle) * distance * 0.9);
      dummy.rotation.set((random() - 0.5) * 0.5, random() * Math.PI, (random() - 0.5) * 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={coins} args={[undefined, gold, COINS]}>
      <cylinderGeometry args={[0.018, 0.018, 0.005, 12]} />
    </instancedMesh>
  );
}

/** A violet sea fan on the right, rocking in the current. */
function SeaFan() {
  const lattice = useCanvasTexture(LATTICE);
  const fan = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (fan.current) fan.current.rotation.x = 0.15 * Math.sin(clock.elapsedTime * 0.8);
  });
  return (
    <group position={[0.3, 0, -0.88]} rotation-y={-0.3}>
      <mesh ref={fan}>
        <circleGeometry args={[0.2, 24, 0, Math.PI]} />
        <meshStandardMaterial map={lattice} color="#c084fc" alphaTest={0.4} side={DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Ribbons of weed bending in the current, each vertex swung further the higher it is. */
function Seaweed({ weed, darkWeed }: { weed: MeshStandardMaterial; darkWeed: MeshStandardMaterial }) {
  const fronds = useMemo(
    () =>
      FRONDS.map(({ height }) => {
        const geometry = new PlaneGeometry(0.05, height, 1, FROND_SEGMENTS);
        geometry.translate(0, height / 2, 0);
        const positions = geometry.getAttribute("position") as BufferAttribute;
        // Tapered to a point at the top.
        for (let index = 0; index < positions.count; index++) {
          positions.setX(index, positions.getX(index) * (1 - (positions.getY(index) / height) * 0.75));
        }
        return { geometry, rest: Float32Array.from(positions.array) };
      }),
    [],
  );
  useEffect(() => () => fronds.forEach(({ geometry }) => geometry.dispose()), [fronds]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    fronds.forEach(({ geometry, rest }, frond) => {
      const { height, phase } = FRONDS[frond];
      const positions = geometry.getAttribute("position") as BufferAttribute;
      for (let index = 0; index < positions.count; index++) {
        const y = rest[index * 3 + 1];
        const reach = (y / height) ** 1.5;
        positions.setX(index, rest[index * 3] + Math.sin(t * 1.1 + phase + y * 6) * 0.06 * reach);
        positions.setZ(index, Math.cos(t * 0.8 + phase + y * 4) * 0.04 * reach);
      }
      positions.needsUpdate = true;
    });
  });

  return (
    <>
      {FRONDS.map(({ x, z, phase }, index) => (
        <mesh
          key={`${x}:${z}`}
          geometry={fronds[index].geometry}
          material={index % 2 ? darkWeed : weed}
          position={[x, 0, z]}
          rotation-y={phase}
        />
      ))}
    </>
  );
}

function Bubbles() {
  const ring = useCanvasTexture(BUBBLE);
  const { geometry, bubbles } = useMemo(() => {
    const random = seededRandom(61);
    const bubbles = Array.from({ length: BUBBLES }, () => {
      const [x, z] = VENTS[Math.floor(random() * VENTS.length)];
      return {
        x: x + (random() - 0.5) * 0.06,
        z: z + (random() - 0.5) * 0.06,
        height: random() * BUBBLE_HEIGHT,
        speed: 0.18 + random() * 0.22,
        phase: random() * Math.PI * 2,
      };
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(BUBBLES * 3), 3));
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(BUBBLES * 3), 3));
    return { geometry, bubbles };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }, delta) => {
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const colors = geometry.getAttribute("color") as BufferAttribute;
    const t = clock.elapsedTime;
    bubbles.forEach((bubble, index) => {
      // Faster as they climb, like real bubbles growing on the way up.
      bubble.height += bubble.speed * delta * (1 + bubble.height * 0.4);
      if (bubble.height > BUBBLE_HEIGHT) bubble.height -= BUBBLE_HEIGHT;
      const wobble = Math.sin(t * 5 + bubble.phase) * 0.012 * (1 + bubble.height);
      positions.setXYZ(index, bubble.x + wobble, bubble.height, bubble.z + Math.cos(t * 4 + bubble.phase) * 0.008);
      const fade = Math.min(1, (BUBBLE_HEIGHT - bubble.height) * 2, bubble.height * 8) * 0.8;
      colors.setXYZ(index, fade * 0.8, fade, fade);
    });
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        map={ring}
        size={0.04}
        vertexColors
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/** Pale shafts of daylight slanting down through the water, swaying slowly. */
function SunShafts() {
  const disc = useSoftDisc();
  const shafts = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    shafts.current.forEach((shaft, index) => {
      if (!shaft) return;
      shaft.rotation.z = -0.2 + index * 0.13 + 0.04 * Math.sin(t * 0.3 + index * 2);
      (shaft.material as MeshBasicMaterial).opacity = 0.08 + 0.05 * Math.sin(t * 0.5 + index * 1.4);
    });
  });
  return (
    <>
      {Array.from({ length: RAYS }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => void (shafts.current[index] = mesh)}
          position={[-0.5 + index * 0.34, 1.05, -0.7 - (index % 2) * 0.15]}
          scale={[0.16 + (index % 2) * 0.08, 2.2, 1]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={disc}
            color="#bff7f2"
            transparent
            opacity={0.1}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

/** A coral tree 1 tall: tapering branches forking two or three ways, merged into one mesh. */
function branchingCoral(random: RandomSource): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const up = new Vector3(0, 1, 0);
  const grow = (from: Vector3, direction: Vector3, length: number, radius: number, depth: number) => {
    const to = from.clone().addScaledVector(direction, length);
    const segment = new CylinderGeometry(radius * 0.72, radius, length, 6);
    segment.applyQuaternion(new Quaternion().setFromUnitVectors(up, direction));
    segment.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    parts.push(segment);
    if (depth === 0) {
      const tip = new SphereGeometry(radius * 0.8, 6, 4);
      tip.translate(to.x, to.y, to.z);
      parts.push(tip);
      return;
    }
    const forks = 2 + (random() < 0.4 ? 1 : 0);
    for (let fork = 0; fork < forks; fork++) {
      const spin = (fork / forks) * Math.PI * 2 + random() * 1.2;
      const spread = 0.45 + random() * 0.35;
      const next = new Vector3(
        direction.x + Math.cos(spin) * spread,
        direction.y,
        direction.z + Math.sin(spin) * spread,
      ).normalize();
      grow(to, next, length * (0.7 + random() * 0.15), radius * 0.72, depth - 1);
    }
  };
  grow(new Vector3(0, -0.02, 0), up.clone(), 0.32, 0.07, 3);
  const merged = mergeGeometries(parts.map((part) => part.toNonIndexed()));
  parts.forEach((part) => part.dispose());
  return merged;
}

/** A dome 1 across, its surface folded into ridges. */
function brainCoral(): BufferGeometry {
  const geometry = new SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const positions = geometry.getAttribute("position") as BufferAttribute;
  const point = new Vector3();
  for (let index = 0; index < positions.count; index++) {
    point.fromBufferAttribute(positions, index);
    const ridge = 1 + 0.05 * Math.sin(point.x * 14 + Math.sin(point.z * 9) * 2) * Math.cos(point.z * 12);
    point.multiplyScalar(ridge);
    positions.setXYZ(index, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Stone tiles in a grid with a gold sun inlaid at the centre, gold strips along some joints, sand and weed stains. */
function drawTiles(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(43);
  const tile = 64;
  context.fillStyle = "#0e1a1c";
  context.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += tile) {
    for (let x = 0; x < size; x += tile) {
      const shade = 52 + random() * 24;
      context.fillStyle = `rgb(${shade - 8},${shade + 6},${shade + 4})`;
      context.fillRect(x + 2, y + 2, tile - 4, tile - 4);
    }
  }
  const gold = "rgba(226,176,64,0.95)";
  context.strokeStyle = gold;
  context.lineWidth = 3;
  for (let line = 0; line < 6; line++) {
    const along = Math.floor(random() * (size / tile)) * tile;
    context.beginPath();
    if (line % 2) {
      context.moveTo(along, 0);
      context.lineTo(along, size);
    } else {
      context.moveTo(0, along);
      context.lineTo(size, along);
    }
    context.stroke();
  }
  const centre = size / 2;
  context.lineWidth = 5;
  [0.36, 0.42].forEach((share) => {
    context.beginPath();
    context.arc(centre, centre, centre * share, 0, Math.PI * 2);
    context.stroke();
  });
  context.lineWidth = 3;
  for (let ray = 0; ray < 16; ray++) {
    const angle = (ray / 16) * Math.PI * 2;
    const inner = centre * 0.42;
    const outer = centre * (ray % 2 ? 0.52 : 0.6);
    context.beginPath();
    context.moveTo(centre + Math.cos(angle) * inner, centre + Math.sin(angle) * inner);
    context.lineTo(centre + Math.cos(angle) * outer, centre + Math.sin(angle) * outer);
    context.stroke();
  }
  for (let stain = 0; stain < 40; stain++) {
    const sand = random() < 0.6;
    const x = random() * size;
    const y = random() * size;
    const radius = 10 + random() * 40;
    const blot = context.createRadialGradient(x, y, 0, x, y, radius);
    blot.addColorStop(0, sand ? "rgba(170,160,128,0.45)" : "rgba(30,80,50,0.4)");
    blot.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = blot;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  for (let fleck = 0; fleck < 3000; fleck++) {
    context.fillStyle = random() < 0.5 ? "rgba(6,14,16,0.35)" : "rgba(120,150,150,0.2)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
}

/** A tiling net of bright lines: where each point is about as near two cells of a scattered grid (Voronoi edges). */
function drawCaustics(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(71);
  const cells = Array.from({ length: 22 }, () => [random() * size, random() * size]);
  const image = context.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let nearest = Infinity;
      let second = Infinity;
      for (const [cx, cy] of cells) {
        // Measured around the wrap, so the pattern tiles.
        const dx = Math.min(Math.abs(px - cx), size - Math.abs(px - cx));
        const dy = Math.min(Math.abs(py - cy), size - Math.abs(py - cy));
        const distance = Math.hypot(dx, dy);
        if (distance < nearest) [second, nearest] = [nearest, distance];
        else if (distance < second) second = distance;
      }
      const value = Math.round(255 * Math.exp(-(second - nearest) / 3.5));
      const at = (py * size + px) * 4;
      image.data[at] = image.data[at + 1] = image.data[at + 2] = value;
      image.data[at + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}

function drawMask(context: CanvasRenderingContext2D, size: number) {
  const fade = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  fade.addColorStop(0, "#ffffff");
  fade.addColorStop(0.55, "#b0b0b0");
  fade.addColorStop(1, "#000000");
  context.fillStyle = fade;
  context.fillRect(0, 0, size, size);
}

/** Ribs fanning out from the foot, crossed by arcs, on transparent: cut out with alphaTest. */
function drawLattice(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 3;
  for (let rib = 0; rib <= 12; rib++) {
    const angle = Math.PI + (rib / 12) * Math.PI;
    context.beginPath();
    context.moveTo(centre, centre);
    context.lineTo(centre + Math.cos(angle) * centre, centre + Math.sin(angle) * centre);
    context.stroke();
  }
  context.lineWidth = 2;
  for (let arc = 1; arc <= 7; arc++) {
    context.beginPath();
    context.arc(centre, centre, (arc / 7) * centre * 0.98, Math.PI, Math.PI * 2);
    context.stroke();
  }
}

/** A thin bright ring with a highlight, so additive points read as bubbles rather than dots. */
function drawBubble(context: CanvasRenderingContext2D, size: number) {
  const centre = size / 2;
  context.strokeStyle = "rgba(255,255,255,0.9)";
  context.lineWidth = size * 0.08;
  context.beginPath();
  context.arc(centre, centre, centre * 0.8, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = "rgba(255,255,255,0.9)";
  context.beginPath();
  context.arc(centre - centre * 0.3, centre - centre * 0.3, centre * 0.16, 0, Math.PI * 2);
  context.fill();
}

const TILES: CanvasLook = { size: 512, draw: drawTiles, fadeFrom: 0.5 };
const CAUSTICS: CanvasLook = { size: 256, draw: drawCaustics, tile: true };
const MASK: CanvasLook = { size: 128, draw: drawMask, linear: true };
const LATTICE: CanvasLook = { size: 256, draw: drawLattice };
const BUBBLE: CanvasLook = { size: 32, draw: drawBubble };
const GILT: NoiseLook = {
  base: [212, 160, 58],
  dark: [96, 110, 60],
  light: [250, 214, 120],
  fadeOut: false,
};
