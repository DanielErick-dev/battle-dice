"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Object3D,
  ShapeGeometry,
  Shape,
  SpriteMaterial,
  type Group,
  type InstancedMesh,
  type Sprite,
} from "three";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom } from "@/game/domain/random";
import { useNoiseTexture, type NoiseLook } from "./noiseTexture";
import { ABOVE_FLOOR, taperedTube, usePaintedTexture, type Painter } from "./sceneryKit";

const PAVING_RADIUS = 1;
/** Thick end first. The trunk rises at the back left; the boughs reach over the figure's head. */
const TRUNK: [number, number, number][] = [
  [-0.8, -0.05, -0.64],
  [-0.75, 0.4, -0.62],
  [-0.64, 0.85, -0.56],
  [-0.48, 1.22, -0.5],
];
const BOUGHS: { points: [number, number, number][]; radius: number }[] = [
  {
    points: [
      [-0.7, 0.68, -0.6],
      [-0.4, 0.92, -0.7],
      [-0.05, 1.08, -0.76],
      [0.22, 1.12, -0.7],
    ],
    radius: 0.034,
  },
  {
    points: [
      [-0.62, 0.9, -0.56],
      [-0.88, 1.18, -0.42],
      [-1.05, 1.32, -0.2],
    ],
    radius: 0.03,
  },
  {
    points: [
      [-0.5, 1.18, -0.5],
      [-0.22, 1.42, -0.46],
      [0.12, 1.5, -0.56],
    ],
    radius: 0.026,
  },
  {
    points: [
      [-0.76, 0.48, -0.62],
      [-0.98, 0.62, -0.78],
      [-1.12, 0.7, -0.94],
    ],
    radius: 0.022,
  },
];
/** Clouds of blossom along the boughs: centre and half-size. */
const BLOSSOMS = [
  { at: [0.18, 1.14, -0.7], size: [0.22, 0.12, 0.16] },
  { at: [-0.12, 1.1, -0.74], size: [0.2, 0.11, 0.15] },
  { at: [-0.4, 0.96, -0.68], size: [0.16, 0.1, 0.14] },
  { at: [-1.02, 1.34, -0.24], size: [0.2, 0.13, 0.18] },
  { at: [-0.84, 1.2, -0.42], size: [0.16, 0.1, 0.14] },
  { at: [0.1, 1.52, -0.55], size: [0.24, 0.12, 0.18] },
  { at: [-0.2, 1.46, -0.46], size: [0.2, 0.12, 0.16] },
  { at: [-0.5, 1.3, -0.5], size: [0.18, 0.12, 0.16] },
  { at: [-1.1, 0.74, -0.92], size: [0.14, 0.09, 0.12] },
] as const;
const BLOSSOM_POINTS = 70;
const PETALS = 70;
const PETAL_SIZE = 0.02;
/** Where petals drift down through: under the boughs and across the stage. */
const PETAL_BOX = { minX: -1.1, maxX: 0.7, minZ: -0.95, maxZ: 0.6, top: 1.5 };
const LANTERN = { x: 0.66, z: -0.6 };
const CANDLE = new Color("#ffc27a").multiplyScalar(2.2);
const NOTEBOOK_SIZE: [number, number] = [0.14, 0.19];

/** Akane's stage: a stone courtyard at dusk under a cherry tree shedding petals, notebooks and a stone lantern. */
export function SakuraCourtyard() {
  const paving = usePaintedTexture(paintPaving, 29, 512, 0.3);
  const bark = useNoiseTexture(BARK);
  const stone = useNoiseTexture(STONE);
  const page = usePaintedTexture(paintNotebookPage, 7, 128);
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: paving, transparent: true, roughness: 0.95, depthWrite: false }),
      bark: new MeshStandardMaterial({ map: bark, color: "#6e5a52", roughness: 1, clippingPlanes: ABOVE_FLOOR }),
      stone: new MeshStandardMaterial({ map: stone, roughness: 0.95, flatShading: true }),
      window: new MeshBasicMaterial({ color: CANDLE, toneMapped: false }),
      page: new MeshStandardMaterial({ map: page, roughness: 0.9, side: DoubleSide }),
      paper: new MeshStandardMaterial({ color: "#efe9dc", roughness: 0.9 }),
      covers: ["#f4a6c6", "#9cc3e8", "#c7b3e6"].map((color) => new MeshStandardMaterial({ color, roughness: 0.7 })),
      pencil: new MeshStandardMaterial({ color: "#f2c14e", roughness: 0.6 }),
      lead: new MeshStandardMaterial({ color: "#d9b38c", roughness: 0.8 }),
      halo: new SpriteMaterial({
        map: disc,
        color: new Color("#ffad5c"),
        opacity: 0.35,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [paving, bark, stone, page, disc],
  );
  useEffect(
    () => () =>
      Object.values(materials)
        .flat()
        .forEach((material) => material.dispose()),
    [materials],
  );
  const wood = useMemo(
    () => [taperedTube(TRUNK, 0.08, 0.55, 28), ...BOUGHS.map(({ points, radius }) => taperedTube(points, radius, 0.8))],
    [],
  );
  useEffect(() => () => wood.forEach((geometry) => geometry.dispose()), [wood]);
  const crown = useRef<Group>(null);
  const flame = useRef<Sprite>(null);
  const leaf = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (crown.current) {
      crown.current.rotation.z = Math.sin(t * 0.6) * 0.012;
      crown.current.rotation.x = Math.sin(t * 0.45 + 1) * 0.008;
    }
    if (flame.current) flame.current.scale.setScalar(0.32 * (1 + 0.1 * Math.sin(t * 9) + 0.06 * Math.sin(t * 23)));
    // A page lifting in the evening breeze and settling back.
    if (leaf.current) leaf.current.rotation.z = 0.04 + 0.6 * Math.max(0, Math.sin(t * 0.7)) ** 3;
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[PAVING_RADIUS, 64]} />
      </mesh>
      <mesh geometry={wood[0]} material={materials.bark} />
      {/* The boughs sway about the trunk's foot; the trunk stays put. */}
      <group position={TRUNK[0]}>
        <group ref={crown}>
          <group position={[-TRUNK[0][0], -TRUNK[0][1], -TRUNK[0][2]]}>
            {wood.slice(1).map((geometry, index) => (
              <mesh key={index} geometry={geometry} material={materials.bark} />
            ))}
            <Blossoms />
          </group>
        </group>
      </group>
      <FallingPetals />
      <group position={[LANTERN.x, 0, LANTERN.z]} rotation-y={0.4}>
        <mesh material={materials.stone} position-y={0.025}>
          <cylinderGeometry args={[0.085, 0.1, 0.05, 6]} />
        </mesh>
        <mesh material={materials.stone} position-y={0.16}>
          <cylinderGeometry args={[0.032, 0.04, 0.22, 8]} />
        </mesh>
        <mesh material={materials.stone} position-y={0.29}>
          <cylinderGeometry args={[0.095, 0.075, 0.04, 6]} />
        </mesh>
        {/* The light box: the glow shows between four stone corner posts. */}
        <mesh material={materials.window} position-y={0.36}>
          <boxGeometry args={[0.08, 0.085, 0.08]} />
        </mesh>
        {[-1, 1].flatMap((sideX) =>
          [-1, 1].map((sideZ) => (
            <mesh key={`${sideX}:${sideZ}`} material={materials.stone} position={[sideX * 0.045, 0.36, sideZ * 0.045]}>
              <boxGeometry args={[0.024, 0.1, 0.024]} />
            </mesh>
          )),
        )}
        <mesh material={materials.stone} position-y={0.44}>
          <coneGeometry args={[0.15, 0.08, 6]} />
        </mesh>
        <mesh material={materials.stone} position-y={0.495}>
          <sphereGeometry args={[0.024, 10, 8]} />
        </mesh>
        <mesh material={materials.stone} position-y={0.528}>
          <coneGeometry args={[0.014, 0.03, 8]} />
        </mesh>
        <sprite ref={flame} material={materials.halo} position-y={0.36} />
      </group>
      {/* An open notebook, one page lifting. */}
      <group position={[0.44, 0, 0.3]} rotation-y={-0.5}>
        <mesh material={materials.covers[0]} position-y={0.004}>
          <boxGeometry args={[NOTEBOOK_SIZE[0] * 2 + 0.01, 0.008, NOTEBOOK_SIZE[1] + 0.01]} />
        </mesh>
        <mesh material={materials.page} position={[-NOTEBOOK_SIZE[0] / 2, 0.011, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={NOTEBOOK_SIZE} />
        </mesh>
        <group ref={leaf} position-y={0.012}>
          <mesh material={materials.page} position-x={NOTEBOOK_SIZE[0] / 2} rotation-x={-Math.PI / 2}>
            <planeGeometry args={NOTEBOOK_SIZE} />
          </mesh>
        </group>
        <group position={[0.02, 0.008, 0.13]} rotation={[0, 0.3, Math.PI / 2]}>
          <mesh material={materials.pencil}>
            <cylinderGeometry args={[0.006, 0.006, 0.14, 6]} />
          </mesh>
          <mesh material={materials.lead} position-y={0.08}>
            <coneGeometry args={[0.006, 0.02, 6]} />
          </mesh>
        </group>
      </group>
      {/* Two closed notebooks in a pile, and a loose page. */}
      <group position={[-0.5, 0, 0.36]} rotation-y={0.7}>
        <Notebook cover={materials.covers[1]} paper={materials.paper} level={0} />
        <Notebook cover={materials.covers[2]} paper={materials.paper} level={1} />
      </group>
      <group position={[0.36, 0, -0.42]} rotation-y={2.6}>
        <mesh material={materials.page} position-y={0.004} rotation-x={-Math.PI / 2}>
          <planeGeometry args={NOTEBOOK_SIZE} />
        </mesh>
      </group>
    </group>
  );
}

/** A closed notebook lying flat, `level` notebooks up its pile. */
function Notebook({
  cover,
  paper,
  level,
}: {
  cover: MeshStandardMaterial;
  paper: MeshStandardMaterial;
  level: number;
}) {
  const thickness = 0.016;
  return (
    <group position-y={level * thickness + thickness / 2} rotation-y={level * 0.25}>
      <mesh material={cover}>
        <boxGeometry args={[NOTEBOOK_SIZE[0], thickness, NOTEBOOK_SIZE[1]]} />
      </mesh>
      <mesh material={paper} position-x={0.003}>
        <boxGeometry args={[NOTEBOOK_SIZE[0] - 0.004, thickness * 0.7, NOTEBOOK_SIZE[1] + 0.002]} />
      </mesh>
    </group>
  );
}

/** Soft pink clouds of blossom: points scattered through each cluster, in a few shades. */
function Blossoms() {
  const disc = useSoftDisc();
  const geometry = useMemo(() => {
    const random = seededRandom(37);
    const count = BLOSSOMS.length * BLOSSOM_POINTS;
    const positions = new Float32Array(count * 3);
    const colours = new Float32Array(count * 3);
    const shades = ["#ffd1e3", "#f9a8d4", "#f487b6", "#ffe4ef"].map((shade) => new Color(shade));
    let index = 0;
    for (const { at, size } of BLOSSOMS) {
      for (let point = 0; point < BLOSSOM_POINTS; point++) {
        // Denser towards each cloud's heart.
        const radius = Math.cbrt(random());
        const theta = random() * Math.PI * 2;
        const phi = Math.acos(2 * random() - 1);
        positions.set(
          [
            at[0] + Math.sin(phi) * Math.cos(theta) * radius * size[0],
            at[1] + Math.cos(phi) * radius * size[1],
            at[2] + Math.sin(phi) * Math.sin(theta) * radius * size[2],
          ],
          index * 3,
        );
        const shade = shades[Math.floor(random() * shades.length)];
        colours.set([shade.r, shade.g, shade.b], index * 3);
        index++;
      }
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(positions, 3));
    result.setAttribute("color", new BufferAttribute(colours, 3));
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        map={disc}
        size={0.075}
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={NormalBlending}
      />
    </points>
  );
}

/** Petals drifting down and fluttering, one instanced mesh. */
function FallingPetals() {
  const geometry = useMemo(() => {
    // A petal with the notch at its tip that cherry petals have.
    const shape = new Shape();
    shape.moveTo(0, -0.5);
    shape.bezierCurveTo(0.45, -0.3, 0.45, 0.3, 0.14, 0.5);
    shape.lineTo(0, 0.36);
    shape.lineTo(-0.14, 0.5);
    shape.bezierCurveTo(-0.45, 0.3, -0.45, -0.3, 0, -0.5);
    return new ShapeGeometry(shape, 6);
  }, []);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#f9b8d6",
        emissive: "#f487b6",
        emissiveIntensity: 0.25,
        roughness: 0.8,
        side: DoubleSide,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  const petals = useMemo(() => {
    const random = seededRandom(43);
    return Array.from({ length: PETALS }, () => ({
      x: PETAL_BOX.minX + random() * (PETAL_BOX.maxX - PETAL_BOX.minX),
      z: PETAL_BOX.minZ + random() * (PETAL_BOX.maxZ - PETAL_BOX.minZ),
      height: random() * PETAL_BOX.top,
      speed: 0.07 + random() * 0.07,
      phase: random() * Math.PI * 2,
      spin: 1 + random() * 2,
    }));
  }, []);
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useFrame(({ clock }, delta) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime;
    petals.forEach((petal, index) => {
      petal.height -= petal.speed * delta;
      if (petal.height < 0) petal.height += PETAL_BOX.top;
      dummy.position.set(
        petal.x + Math.sin(t * 0.7 + petal.phase) * 0.12,
        petal.height,
        petal.z + Math.cos(t * 0.5 + petal.phase) * 0.06,
      );
      dummy.rotation.set(t * petal.spin + petal.phase, petal.phase, Math.sin(t * 1.5 + petal.phase) * 0.8);
      dummy.scale.setScalar(PETAL_SIZE);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, PETALS]} frustumCulled={false} />;
}

/** Pale pavers in staggered rows, mossy joints, the odd fallen petal; tinted by the dusk. */
const paintPaving: Painter = (context, size, random) => {
  context.fillStyle = "#2a2b26";
  context.fillRect(0, 0, size, size);
  const row = 84;
  for (let y = 0; y < size; y += row) {
    const offset = (y / row) % 2 ? row * 0.5 : 0;
    for (let x = -offset; x < size;) {
      const width = row * (0.8 + random() * 0.7);
      const shade = 92 + random() * 26;
      context.fillStyle = `rgb(${shade + 8},${shade},${shade + 2})`;
      context.fillRect(x + 3, y + 3, width - 6, row - 6);
      x += width;
    }
  }
  for (let fleck = 0; fleck < 3000; fleck++) {
    context.fillStyle = random() < 0.55 ? "rgba(40,36,38,0.3)" : "rgba(220,210,214,0.18)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  for (let tuft = 0; tuft < 90; tuft++) {
    const y = Math.floor(random() * (size / row)) * row + (random() < 0.5 ? 0 : row - 3);
    context.fillStyle = `rgba(70,96,52,${0.4 + random() * 0.3})`;
    context.fillRect(random() * size, y - 1, 4 + random() * 10, 4);
  }
  for (let petal = 0; petal < 120; petal++) {
    context.fillStyle = random() < 0.5 ? "rgba(249,168,212,0.9)" : "rgba(255,214,230,0.85)";
    context.beginPath();
    context.ellipse(
      random() * size,
      random() * size,
      2.5 + random() * 2,
      1.5 + random(),
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
};

/** A ruled exercise-book page with a margin and lines of tidy notes. */
const paintNotebookPage: Painter = (context, size, random) => {
  context.fillStyle = "#f6f2e8";
  context.fillRect(0, 0, size, size);
  context.strokeStyle = "rgba(110,150,210,0.55)";
  context.lineWidth = 1;
  for (let line = 14; line < size; line += 9) {
    context.beginPath();
    context.moveTo(0, line);
    context.lineTo(size, line);
    context.stroke();
  }
  context.strokeStyle = "rgba(230,110,140,0.7)";
  context.beginPath();
  context.moveTo(18, 0);
  context.lineTo(18, size);
  context.stroke();
  context.strokeStyle = "rgba(40,40,70,0.75)";
  for (let line = 14; line < size - 10; line += 9) {
    let x = 22;
    const end = 60 + random() * 62;
    context.beginPath();
    while (x < end) {
      const word = 6 + random() * 14;
      context.moveTo(x, line - 2);
      for (let step = 0; step < word; step += 2) context.lineTo(x + step, line - 2 - random() * 4);
      x += word + 4;
    }
    context.stroke();
  }
};

const BARK: NoiseLook = { base: [58, 42, 40], dark: [26, 18, 18], light: [96, 78, 74], fadeOut: false };
const STONE: NoiseLook = { base: [96, 94, 90], dark: [52, 50, 48], light: [138, 134, 126], fadeOut: false };
