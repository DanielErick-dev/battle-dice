"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  PlaneGeometry,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
  type Group,
} from "three";
import { Prop, usePropMesh } from "@/features/match/scene/character/props";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom } from "@/game/domain/random";
import { grassTuft, scatterAround } from "./sceneryKit";
import { useCanvasTexture, useNoiseTexture, type NoiseLook, type Painter } from "./textures";

const GROUND_RADIUS = 1;
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
/** The straw butt she practises on, turned towards the middle. */
const TARGET = { x: 0.58, z: -0.4, turn: -0.6, radius: 0.15, height: 0.3 };
/** Arrows in the target's face: offset on it and slant. */
const TARGET_ARROWS = [
  { x: 0.02, y: 0.03, tilt: [0.08, -0.1] },
  { x: -0.06, y: -0.04, tilt: [-0.05, 0.12] },
];
/** Arrows stuck in the ground at the front sides, as if from a volley. */
const GROUND_ARROWS = [
  { x: -0.46, z: 0.42, tilt: [0.25, 0.15] },
  { x: -0.36, z: 0.52, tilt: [0.18, -0.2] },
  { x: 0.44, z: 0.48, tilt: [0.22, -0.18] },
];
const ARROW_LENGTH = 0.3;
const FERNS = [
  { x: -0.68, z: -0.48, size: 1 },
  { x: -0.78, z: 0.1, size: 0.75 },
  { x: 0.32, z: -0.9, size: 0.9 },
  { x: 0.8, z: -0.08, size: 0.7 },
];
const FRONDS = 7;
const MUSHROOM_CLUSTERS = [
  { x: -0.02, z: -0.66, count: 4 },
  { x: 0.44, z: -0.76, count: 3 },
  { x: -0.5, z: -0.06, count: 3 },
  { x: 0.56, z: 0.2, count: 2 },
];
const SPORE = new Color("#7dffc4");
const TUFTS = 18;
const FIREFLIES = 26;
const FIREFLY = new Color("#e4ff7a").multiplyScalar(1.8);

/**
 * The Elven Archer's stage instead of the rune pedestal: a mossy forest glade, roots and a fallen log, ferns,
 * glowing mushrooms, a practice target and arrows in the ground, fireflies drifting. Origin on the floor.
 */
export function ElvenGlade() {
  const moss = useCanvasTexture({ size: 512, draw: paintMossFloor, seed: 37, fadeFrom: 0.45 });
  const bark = useNoiseTexture(BARK);
  const lichen = useNoiseTexture(LICHEN);
  const straw = useNoiseTexture(STRAW);
  const face = useCanvasTexture({ size: 256, draw: paintTargetFace, seed: 73, tile: true });
  const disc = useSoftDisc();
  const arrow = usePropMesh("elvenArrow");
  const materials = useMemo(
    () => ({
      ground: new MeshStandardMaterial({ map: moss, transparent: true, roughness: 1, depthWrite: false }),
      bark: new MeshStandardMaterial({ map: bark, roughness: 1 }),
      heartwood: new MeshStandardMaterial({ color: "#8a6a44", roughness: 0.9 }),
      moss: new MeshStandardMaterial({ map: lichen, roughness: 1 }),
      straw: new MeshStandardMaterial({ map: straw, roughness: 1 }),
      face: new MeshStandardMaterial({ map: face, roughness: 0.95 }),
      wood: new MeshStandardMaterial({ color: "#4a3622", roughness: 0.9 }),
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
    [moss, bark, lichen, straw, face, disc],
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
      <Target materials={materials} arrow={arrow} />
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

/** A round straw butt on a wooden easel, with a couple of her arrows in it. */
function Target({
  materials,
  arrow,
}: {
  materials: Record<"straw" | "face" | "wood", MeshStandardMaterial>;
  arrow: ReturnType<typeof usePropMesh>;
}) {
  const { x, z, turn, radius, height } = TARGET;
  const depth = 0.06;
  return (
    <group position={[x, 0, z]} rotation-y={turn}>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          material={materials.wood}
          position={[side * radius * 0.7, height * 0.62, -0.02]}
          rotation={[0.12, 0, side * -0.18]}
        >
          <boxGeometry args={[0.018, height * 1.35, 0.018]} />
        </mesh>
      ))}
      <mesh material={materials.wood} position={[0, height * 0.55, -0.16]} rotation-x={-0.42}>
        <boxGeometry args={[0.018, height * 1.25, 0.018]} />
      </mesh>
      <group position={[0, height + 0.04, 0]} rotation-x={-0.12}>
        <mesh material={[materials.straw, materials.face, materials.straw]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[radius, radius, depth, 28]} />
        </mesh>
        {TARGET_ARROWS.map(({ x: ax, y, tilt }) => (
          <group
            key={`${ax}:${y}`}
            position={[ax, y, depth / 2 + ARROW_LENGTH / 2 - 0.05]}
            rotation={[-Math.PI / 2 + tilt[0], 0, tilt[1]]}
          >
            <Prop geometry={arrow.geometry} material={arrow.material} height={ARROW_LENGTH} />
          </group>
        ))}
      </group>
    </group>
  );
}

function Ferns() {
  const texture = useCanvasTexture({ size: 128, height: 384, draw: paintFrond, seed: 61 });
  const geometry = useMemo(() => {
    const result = new PlaneGeometry(0.1, 0.34, 1, 8);
    result.translate(0, 0.17, 0);
    // Arched: the frond curls over further the farther out it reaches.
    const position = result.getAttribute("position") as BufferAttribute;
    for (let index = 0; index < position.count; index++) {
      const along = position.getY(index) / 0.34;
      position.setZ(index, along * along * 0.12);
    }
    result.computeVertexNormals();
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const ferns = useRef<(Group | null)[]>([]);
  const fronds = useMemo(() => {
    const random = seededRandom(59);
    return FERNS.map(() =>
      Array.from({ length: FRONDS }, (_, index) => ({
        turn: (index / FRONDS) * Math.PI * 2 + random() * 0.5,
        tilt: 0.45 + random() * 0.5,
        size: 0.75 + random() * 0.4,
      })),
    );
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ferns.current.forEach((fern, index) => {
      if (!fern) return;
      fern.rotation.z = 0.04 * Math.sin(t * 0.9 + index * 1.7);
      fern.rotation.x = 0.03 * Math.sin(t * 0.7 + index);
    });
  });

  return (
    <>
      {FERNS.map(({ x, z, size }, fern) => (
        <group
          key={`${x}:${z}`}
          ref={(group) => {
            ferns.current[fern] = group;
          }}
          position={[x, 0, z]}
          scale={size}
        >
          {fronds[fern].map(({ turn, tilt, size: frond }, index) => (
            <group key={index} rotation-y={turn}>
              <mesh geometry={geometry} rotation-x={tilt} scale={frond}>
                <meshStandardMaterial map={texture} alphaTest={0.4} side={DoubleSide} roughness={0.9} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </>
  );
}

function GrassTufts() {
  const { variants, tufts } = useMemo(() => {
    const random = seededRandom(67);
    const root = new Color("#1f3310");
    const tip = new Color("#8fbf3a");
    const variants = [0, 1, 2].map(() => grassTuft(random, 9, 0.13, root, tip));
    const tufts = scatterAround(random, TUFTS, 0.32, 0.92).map(([x, z], index) => ({
      x,
      z,
      variant: index % variants.length,
      size: 0.7 + random() * 0.7,
      turn: random() * Math.PI * 2,
      phase: random() * Math.PI * 2,
    }));
    return { variants, tufts };
  }, []);
  useEffect(() => () => variants.forEach((variant) => variant.dispose()), [variants]);
  const meshes = useRef<(Group | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    tufts.forEach(({ phase }, index) => {
      const tuft = meshes.current[index];
      if (tuft) tuft.rotation.z = 0.06 * Math.sin(t * 1.1 + phase);
    });
  });

  return (
    <>
      {tufts.map(({ x, z, variant, size, turn }, index) => (
        <group
          key={index}
          ref={(group) => {
            meshes.current[index] = group;
          }}
          position={[x, 0, z]}
        >
          <mesh geometry={variants[variant]} rotation-y={turn} scale={size}>
            <meshStandardMaterial vertexColors side={DoubleSide} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Wandering sparks that glow and go dark in turn; dark ones add nothing, being additive. */
function Fireflies() {
  const disc = useSoftDisc();
  const { geometry, flies } = useMemo(() => {
    const random = seededRandom(71);
    const flies = Array.from({ length: FIREFLIES }, () => ({
      x: (random() - 0.5) * 1.5,
      y: 0.12 + random() * 1.25,
      z: -0.95 + random() * 1.25,
      phase: random() * Math.PI * 2,
      rate: 0.5 + random() * 0.9,
      wander: 0.06 + random() * 0.1,
    }));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(FIREFLIES * 3), 3));
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(FIREFLIES * 3), 3));
    return { geometry, flies };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const colors = geometry.getAttribute("color") as BufferAttribute;
    flies.forEach(({ x, y, z, phase, rate, wander }, index) => {
      positions.setXYZ(
        index,
        x + Math.sin(t * 0.31 * rate + phase) * wander * 2,
        y + Math.sin(t * 0.47 * rate + phase * 2) * wander,
        z + Math.cos(t * 0.27 * rate + phase) * wander * 2,
      );
      const glow = Math.max(0, Math.sin(t * rate + phase)) ** 3;
      colors.setXYZ(index, FIREFLY.r * glow, FIREFLY.g * glow, FIREFLY.b * glow);
    });
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        map={disc}
        vertexColors
        size={0.055}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/** Moss in mottled greens, bare earth showing through, blades of grass and a few fallen leaves. */
const paintMossFloor: Painter = (context, size, random) => {
  context.fillStyle = "#26361a";
  context.fillRect(0, 0, size, size);
  const blot = (x: number, y: number, radius: number, colour: string) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  for (let index = 0; index < 40; index++)
    blot(random() * size, random() * size, 14 + random() * 30, "rgba(58,40,24,0.7)");
  for (let index = 0; index < 220; index++) {
    const green = random() < 0.5 ? "rgba(84,124,40,0.55)" : "rgba(40,70,26,0.6)";
    blot(random() * size, random() * size, 8 + random() * 26, green);
  }
  context.lineCap = "round";
  for (let index = 0; index < 4200; index++) {
    const x = random() * size;
    const y = random() * size;
    const angle = random() * Math.PI * 2;
    const length = 2 + random() * 6;
    const light = random();
    context.strokeStyle =
      light < 0.4 ? "rgba(140,190,70,0.45)" : light < 0.8 ? "rgba(60,96,32,0.5)" : "rgba(18,28,12,0.5)";
    context.lineWidth = 0.8 + random();
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.stroke();
  }
  for (let index = 0; index < 90; index++) {
    context.save();
    context.translate(random() * size, random() * size);
    context.rotate(random() * Math.PI);
    context.fillStyle = ["rgba(176,140,48,0.75)", "rgba(140,92,36,0.7)", "rgba(156,170,60,0.7)"][index % 3];
    context.beginPath();
    context.ellipse(0, 0, 4 + random() * 3, 2 + random() * 1.5, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
};

/** A fern frond on transparent: a stalk with paired leaflets shrinking towards the tip. */
const paintFrond: Painter = (context, size, random) => {
  const width = 128;
  const height = 384;
  context.strokeStyle = "#3d5a1c";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(width / 2, height);
  context.lineTo(width / 2, 6);
  context.stroke();
  for (let y = height - 20; y > 10; y -= 14) {
    const along = 1 - y / height;
    const reach = (width / 2 - 6) * Math.sin(Math.PI * Math.min(1, 0.25 + along * 0.85)) * (1 - along * 0.55);
    for (const side of [-1, 1]) {
      const shade = 90 + random() * 50;
      context.fillStyle = `rgb(${shade * 0.45},${shade},${shade * 0.3})`;
      context.save();
      context.translate(width / 2, y);
      context.rotate(side * -0.35);
      context.beginPath();
      context.ellipse((side * reach) / 2, 0, reach / 2, 5.5, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }
};

/** The face of the butt: painted rings over straw, weathered. */
const paintTargetFace: Painter = (context, size, random) => {
  const rings = ["#d8cba4", "#3b5a2a", "#d8cba4", "#7a2a1c", "#d8b04a"];
  rings.forEach((colour, index) => {
    context.fillStyle = colour;
    context.beginPath();
    context.arc(size / 2, size / 2, (size / 2) * (1 - index / rings.length), 0, Math.PI * 2);
    context.fill();
  });
  // Straw poking through the paint.
  for (let index = 0; index < 900; index++) {
    context.strokeStyle = random() < 0.5 ? "rgba(120,96,48,0.35)" : "rgba(230,210,150,0.3)";
    const x = random() * size;
    const y = random() * size;
    const angle = random() * Math.PI;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * 6, y + Math.sin(angle) * 6);
    context.stroke();
  }
};

const BARK: NoiseLook = { base: [62, 46, 32], dark: [30, 22, 16], light: [96, 78, 56], fadeOut: false };
const LICHEN: NoiseLook = { base: [70, 104, 38], dark: [36, 58, 22], light: [124, 160, 66], fadeOut: false };
const STRAW: NoiseLook = { base: [176, 146, 82], dark: [118, 94, 50], light: [214, 190, 128], fadeOut: false };
