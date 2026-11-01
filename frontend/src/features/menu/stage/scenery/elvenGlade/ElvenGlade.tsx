"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  MeshStandardMaterial,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import { seededRandom } from "@/game/domain/core/random";
import { GROUND_RADIUS } from "../kit/geometry";
import { useCanvasTexture, useNoiseTexture } from "../kit/textures";
import { Ferns } from "./Ferns";
import { Fireflies } from "./Fireflies";
import { GrassTufts } from "./GrassTufts";
import { Target } from "./Target";
import { ARROW_LENGTH } from "./layout";
import { BARK, LICHEN, paintGladeFloor } from "./textures";
import { Prop, usePropMesh, useSoftDisc } from "../kit/matchAssets";

const LOG = { x: -0.2, z: -0.78, turn: 0.2, length: 0.9, radius: 0.085 };

/** Roots of an old tree just off the stage, thick end first, arching out of the moss and diving back in. */
const ROOTS = [
  {
    radius: 0.05,
    points: [
      [0.88, -0.03, -0.62],
      [0.74, 0.13, -0.7],
      [0.52, 0.09, -0.8],
      [0.34, -0.03, -0.9],
    ],
  },
  {
    radius: 0.045,
    points: [
      [-0.88, -0.03, -0.3],
      [-0.74, 0.12, -0.36],
      [-0.6, 0.07, -0.22],
      [-0.5, -0.03, -0.1],
    ],
  },
  {
    radius: 0.035,
    points: [
      [-0.84, -0.02, -0.56],
      [-0.7, 0.09, -0.66],
      [-0.6, 0.03, -0.62],
    ],
  },
];

/** Arrows stuck in the ground at the front sides, as if from a volley. */
const GROUND_ARROWS = [
  { x: -0.46, z: 0.42, tilt: [0.25, 0.15] },
  { x: -0.36, z: 0.52, tilt: [0.18, -0.2] },
  { x: 0.44, z: 0.48, tilt: [0.22, -0.18] },
];

const MUSHROOM_CLUSTERS = [
  { x: -0.02, z: -0.66, count: 4 },
  { x: 0.44, z: -0.76, count: 3 },
  { x: -0.5, z: -0.06, count: 3 },
  { x: 0.56, z: 0.2, count: 2 },
];

const SPORE = new Color("#7dffc4");

/**
 * The Elven Archer's stage instead of the rune pedestal: a mossy forest glade, roots and a fallen log, ferns,
 * glowing mushrooms, a practice target and arrows in the ground, fireflies drifting. Origin on the floor.
 */
export function ElvenGlade() {
  const moss = useCanvasTexture({ size: 512, draw: paintGladeFloor, seed: 37, fadeFrom: 0.45 });
  const bark = useNoiseTexture(BARK);
  const lichen = useNoiseTexture(LICHEN);
  const disc = useSoftDisc();
  const arrow = usePropMesh("elvenArrow");
  const materials = useMemo(
    () => ({
      ground: new MeshStandardMaterial({ map: moss, transparent: true, roughness: 1, depthWrite: false }),
      bark: new MeshStandardMaterial({ map: bark, roughness: 1 }),
      heartwood: new MeshStandardMaterial({ color: "#8a6a44", roughness: 0.9 }),
      moss: new MeshStandardMaterial({ map: lichen, roughness: 1 }),
      stem: new MeshStandardMaterial({ color: "#d8e8d0", emissive: "#3a6650", emissiveIntensity: 0.5 }),
      cap: new MeshStandardMaterial({ color: "#a8ffe0", emissive: SPORE, emissiveIntensity: 1.1, toneMapped: false }),
      halo: new SpriteMaterial({
        map: disc,
        color: SPORE,
        opacity: 0.22,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    }),
    [moss, bark, lichen, disc],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const roots = useMemo(() => ROOTS.map(({ points, radius }) => taperedRoot(points as Vec3[], radius)), []);
  useEffect(() => () => roots.forEach((root) => root.dispose()), [roots]);
  const mushrooms = useMemo(() => {
    const random = seededRandom(43);
    return MUSHROOM_CLUSTERS.map((cluster) => ({
      ...cluster,
      caps: Array.from({ length: cluster.count }, (_, index) => ({
        x: index ? (random() - 0.5) * 0.09 : 0,
        z: index ? (random() - 0.5) * 0.07 : 0,
        height: index ? 0.025 + random() * 0.025 : 0.06,
        size: index ? 0.012 + random() * 0.01 : 0.024,
        lean: (random() - 0.5) * 0.5,
      })),
    }));
  }, []);

  useFrame(({ clock }) => {
    const pulse = Math.sin(clock.elapsedTime * 1.3);
    materials.cap.setValues({ emissiveIntensity: 1 + 0.25 * pulse });
    materials.halo.setValues({ opacity: 0.18 + 0.07 * pulse });
  });

  return (
    <group>
      <mesh material={materials.ground} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {roots.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={materials.bark} />
      ))}
      <group position={[LOG.x, LOG.radius * 0.8, LOG.z]} rotation-y={LOG.turn}>
        <mesh material={[materials.bark, materials.heartwood, materials.heartwood]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[LOG.radius * 0.88, LOG.radius, LOG.length, 16]} />
        </mesh>
        {/* A mantle of moss over the top, thickest towards the old end. */}
        <mesh material={materials.moss} rotation-z={Math.PI / 2}>
          <cylinderGeometry
            args={[LOG.radius * 0.94, LOG.radius * 1.07, LOG.length * 0.85, 16, 1, true, Math.PI / 2 - 1.1, 2.2]}
          />
        </mesh>
        {[-0.3, -0.08, 0.2].map((along, index) => (
          <mesh
            key={along}
            material={materials.moss}
            position={[along, LOG.radius * 0.95, 0.01]}
            scale={[0.07 + index * 0.01, 0.025, 0.055]}
          >
            <sphereGeometry args={[1, 10, 6]} />
          </mesh>
        ))}
      </group>
      <Target arrow={arrow} />
      {GROUND_ARROWS.map(({ x, z, tilt }) => (
        <group key={`${x}:${z}`} position={[x, ARROW_LENGTH / 2 - 0.06, z]} rotation={[Math.PI + tilt[0], 0, tilt[1]]}>
          <Prop geometry={arrow.geometry} material={arrow.material} height={ARROW_LENGTH} />
        </group>
      ))}
      {mushrooms.map(({ x, z, caps }) => (
        <group key={`${x}:${z}`} position={[x, 0, z]}>
          {caps.map(({ x: cx, z: cz, height, size, lean }, index) => (
            <group key={index} position={[cx, 0, cz]} rotation-z={lean}>
              <mesh material={materials.stem} position-y={height / 2}>
                <cylinderGeometry args={[size * 0.28, size * 0.38, height, 6]} />
              </mesh>
              <mesh material={materials.cap} position-y={height} scale={[1, 0.55, 1]}>
                <sphereGeometry args={[size, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
              </mesh>
            </group>
          ))}
          <sprite material={materials.halo} position-y={0.05} scale={0.32} />
        </group>
      ))}
      <Ferns />
      <GrassTufts />
      <Fireflies />
    </group>
  );
}

type Vec3 = [number, number, number];

/** A root along `points`, `radius` thick at its first point and thinning to a third of that at its last. */
function taperedRoot(points: Vec3[], radius: number): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)));
  const segments = 24;
  const sides = 8;
  const geometry = new TubeGeometry(curve, segments, radius, sides, false);
  const position = geometry.getAttribute("position") as BufferAttribute;
  const centre = new Vector3();
  const vertex = new Vector3();
  for (let index = 0; index < position.count; index++) {
    const t = Math.floor(index / (sides + 1)) / segments;
    curve.getPointAt(t, centre);
    vertex
      .fromBufferAttribute(position, index)
      .sub(centre)
      .multiplyScalar(1 - 0.65 * t);
    position.setXYZ(index, centre.x + vertex.x, centre.y + vertex.y, centre.z + vertex.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}
