"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  DoubleSide,
  LatheGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  SpriteMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
  type InstancedMesh,
  type Group,
  type Sprite,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom } from "@/game/domain/random";
import { useCanvasTexture } from "./canvasTexture";
import { useNoiseTexture, type NoiseLook } from "./noiseTexture";

const SOIL_RADIUS = 1;
const CIRCLE_RADIUS = 0.8;
const FLAME = new Color("#ffb066").multiplyScalar(2.1);
const BLOOD_GLOW = "#ff2448";
/** Rose bushes around the circle: `radius` of the mound, how many `roses` bloom on it. */
const BUSHES = [
  { x: -0.72, z: -0.42, radius: 0.15, roses: 4 },
  { x: -0.36, z: -0.82, radius: 0.13, roses: 3 },
  { x: 0.08, z: -0.92, radius: 0.1, roses: 2 },
  { x: 0.38, z: -0.8, radius: 0.14, roses: 4 },
  { x: 0.74, z: -0.36, radius: 0.13, roses: 3 },
  { x: -0.84, z: 0.14, radius: 0.08, roses: 2 },
  { x: 0.84, z: 0.18, radius: 0.07, roses: 1 },
];
const LEAVES_PER_RADIUS = 160;
/** Thorny vines crawling out from the bushes over the soil, as [x, z] points. */
const VINES: [number, number][][] = [
  [
    [-0.72, -0.42],
    [-0.6, -0.22],
    [-0.68, -0.02],
    [-0.58, 0.14],
    [-0.48, 0.1],
  ],
  [
    [0.74, -0.36],
    [0.6, -0.16],
    [0.68, 0.02],
    [0.56, 0.22],
  ],
  [
    [-0.36, -0.82],
    [-0.18, -0.68],
    [-0.04, -0.74],
    [0.08, -0.62],
  ],
  [
    [0.38, -0.8],
    [0.5, -0.58],
    [0.36, -0.5],
  ],
];
const THORNS_PER_VINE = 14;
const CANDELABRA = [
  { x: -0.56, z: -0.64, height: 0.62 },
  { x: 0.58, z: -0.6, height: 0.5 },
];
const ARM_REACH = 0.08;
const PETALS = 26;
const PETAL_HEIGHT = 1.9;

/**
 * The Crimson Enchantress's stage instead of the rune pedestal: a blood circle painted on dark soil, crimson rose
 * bushes and thorny vines around it, iron candelabra and petals drifting down. Origin on the floor; flames are sprites.
 */
export function BloodRoseGarden() {
  const soil = useNoiseTexture(SOIL);
  const circle = useCanvasTexture({ size: 512, draw: paintBloodCircle });
  const disc = useSoftDisc();
  const materials = useMemo(() => {
    const glow = { transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false };
    return {
      soil: new MeshStandardMaterial({ map: soil, transparent: true, roughness: 1, depthWrite: false }),
      circle: new MeshBasicMaterial({ map: circle, transparent: true, depthWrite: false }),
      circleGlow: new MeshBasicMaterial({ map: circle, color: BLOOD_GLOW, ...glow }),
      bush: new MeshStandardMaterial({ color: "#0e160c", roughness: 1 }),
      leaf: new MeshStandardMaterial({ color: "#1d2c17", roughness: 0.7, flatShading: true }),
      rose: new MeshStandardMaterial({
        color: "#a0102a",
        roughness: 0.55,
        emissive: "#3d0010",
        emissiveIntensity: 0.6,
        side: DoubleSide,
        flatShading: true,
      }),
      vine: new MeshStandardMaterial({ color: "#24130e", roughness: 0.8 }),
      iron: new MeshStandardMaterial({ color: "#1b1716", roughness: 0.45, metalness: 0.8 }),
      wax: new MeshStandardMaterial({ color: "#5e0a16", roughness: 0.6 }),
      flame: new SpriteMaterial({ map: disc, color: FLAME, ...glow }),
      halo: new SpriteMaterial({ map: disc, color: "#ff3a3a", opacity: 0.14, ...glow }),
      petal: new MeshStandardMaterial({ color: "#b3122f", roughness: 0.6, side: DoubleSide }),
    };
  }, [soil, circle, disc]);
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const geometries = useMemo(
    () => ({
      rose: roseGeometry(),
      leaf: new OctahedronGeometry(1, 0),
      thorn: new ConeGeometry(0.005, 0.022, 4).translate(0, 0.011, 0),
      vines: VINES.map((points) => new TubeGeometry(vineCurve(points), 40, 0.007, 5)),
      petal: petalGeometry(),
    }),
    [],
  );
  useEffect(
    () => () =>
      Object.values(geometries)
        .flat()
        .forEach((geometry) => geometry.dispose()),
    [geometries],
  );
  const layout = useMemo(() => gardenLayout(), []);
  const leaves = useRef<InstancedMesh>(null);
  const roses = useRef<InstancedMesh>(null);
  const thorns = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const fill = (mesh: InstancedMesh | null, placements: Object3D[]) => {
      if (!mesh) return;
      placements.forEach((placement, index) => mesh.setMatrixAt(index, placement.matrix));
      mesh.instanceMatrix.needsUpdate = true;
    };
    fill(leaves.current, layout.leaves);
    fill(roses.current, layout.roses);
    fill(thorns.current, layout.thorns);
  }, [layout]);
  const ring = useRef<Group>(null);
  const flames = useRef<(Sprite | null)[]>([]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    // A slow heartbeat: two quick throbs, then rest.
    const beat = Math.max(0, Math.sin(t * 2.4)) ** 6 + 0.6 * Math.max(0, Math.sin(t * 2.4 - 0.9)) ** 6;
    materials.circleGlow.setValues({ opacity: 0.12 + 0.35 * beat });
    if (ring.current) ring.current.rotation.z += delta * 0.025;
    flames.current.forEach((flame, index) => {
      if (!flame) return;
      const flicker = 1 + 0.12 * Math.sin(t * 13 + index * 2.1) + 0.08 * Math.sin(t * 29 + index);
      flame.scale.set(0.028 * flicker, 0.055 * (2 - flicker), 1);
    });
  });

  return (
    <group>
      <mesh material={materials.soil} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[SOIL_RADIUS, 64]} />
      </mesh>
      <group ref={ring} rotation-x={-Math.PI / 2} position-y={0.003}>
        <mesh material={materials.circle}>
          <planeGeometry args={[CIRCLE_RADIUS * 2, CIRCLE_RADIUS * 2]} />
        </mesh>
        <mesh material={materials.circleGlow} position-z={0.001}>
          <planeGeometry args={[CIRCLE_RADIUS * 2, CIRCLE_RADIUS * 2]} />
        </mesh>
      </group>
      {BUSHES.map(({ x, z, radius }) => (
        <mesh
          key={`${x}:${z}`}
          material={materials.bush}
          position={[x, -0.01, z]}
          scale={[radius, radius * 0.75, radius]}
        >
          <sphereGeometry args={[1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      ))}
      <instancedMesh ref={leaves} args={[geometries.leaf, materials.leaf, layout.leaves.length]} />
      <instancedMesh ref={roses} args={[geometries.rose, materials.rose, layout.roses.length]} />
      <instancedMesh ref={thorns} args={[geometries.thorn, materials.vine, layout.thorns.length]} />
      {geometries.vines.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={materials.vine} />
      ))}
      {CANDELABRA.map(({ x, z, height }, stand) => (
        <group key={x} position={[x, 0, z]} rotation-y={x > 0 ? -0.4 : 0.4}>
          {[0, 1, 2].map((foot) => (
            <mesh
              key={foot}
              material={materials.iron}
              position={[Math.cos((foot * Math.PI * 2) / 3) * 0.035, 0.012, Math.sin((foot * Math.PI * 2) / 3) * 0.035]}
              rotation={[0, (-foot * Math.PI * 2) / 3, -0.5]}
            >
              <boxGeometry args={[0.07, 0.008, 0.01]} />
            </mesh>
          ))}
          <mesh material={materials.iron} position-y={height / 2}>
            <cylinderGeometry args={[0.006, 0.01, height, 8]} />
          </mesh>
          {/* The arms curve down from one candle to the other, under the middle one. */}
          <mesh material={materials.iron} position-y={height - 0.06} rotation-z={Math.PI}>
            <torusGeometry args={[ARM_REACH, 0.005, 6, 20, Math.PI]} />
          </mesh>
          {[-ARM_REACH, 0, ARM_REACH].map((offset, candle) => {
            const base = offset === 0 ? height : height - 0.06;
            return (
              <group key={candle} position={[offset, base, 0]}>
                <mesh material={materials.iron} position-y={0.004}>
                  <cylinderGeometry args={[0.02, 0.012, 0.008, 10]} />
                </mesh>
                <mesh material={materials.wax} position-y={0.008 + 0.03}>
                  <cylinderGeometry args={[0.009, 0.01, 0.06, 10]} />
                </mesh>
                <sprite
                  ref={(sprite) => {
                    flames.current[stand * 3 + candle] = sprite;
                  }}
                  material={materials.flame}
                  position-y={0.09}
                />
                <sprite material={materials.halo} position-y={0.09} scale={0.26} />
              </group>
            );
          })}
        </group>
      ))}
      <FallingPetals geometry={geometries.petal} material={materials.petal} />
    </group>
  );
}

function FallingPetals({ geometry, material }: { geometry: ShapeGeometry; material: MeshStandardMaterial }) {
  const mesh = useRef<InstancedMesh>(null);
  const { petals, dummy } = useMemo(() => {
    const random = seededRandom(113);
    return {
      petals: Array.from({ length: PETALS }, () => ({
        x: (random() - 0.5) * 1.7,
        z: -0.9 + random() * 1.3,
        height: random() * PETAL_HEIGHT,
        speed: 0.08 + random() * 0.08,
        phase: random() * Math.PI * 2,
        spin: 0.8 + random() * 1.6,
      })),
      dummy: new Object3D(),
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const instances = mesh.current;
    if (!instances) return;
    const t = clock.elapsedTime;
    petals.forEach((petal, index) => {
      petal.height -= petal.speed * delta;
      if (petal.height < 0) petal.height += PETAL_HEIGHT;
      dummy.position.set(
        petal.x + Math.sin(t * 0.7 + petal.phase) * 0.12,
        petal.height,
        petal.z + Math.cos(t * 0.5 + petal.phase) * 0.06,
      );
      dummy.rotation.set(t * petal.spin + petal.phase, petal.phase, Math.sin(t * petal.spin) * 0.8);
      dummy.updateMatrix();
      instances.setMatrixAt(index, dummy.matrix);
    });
    instances.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, PETALS]} frustumCulled={false} />;
}

/** Where every leaf, rose and thorn goes; fixed by a seed so the garden never rearranges. */
function gardenLayout() {
  const random = seededRandom(101);
  const place = (position: Vector3, rotation: [number, number, number], scale: [number, number, number]) => {
    const placement = new Object3D();
    placement.position.copy(position);
    placement.rotation.set(...rotation);
    placement.scale.set(...scale);
    placement.updateMatrix();
    return placement;
  };
  // A point on a bush's dome, `lift` keeping it off the bottom rim.
  const onDome = (x: number, z: number, radius: number, lift: number) => {
    const angle = random() * Math.PI * 2;
    const rise = lift + random() * (1 - lift);
    const out = Math.sqrt(1 - rise * rise);
    return new Vector3(x + Math.cos(angle) * out * radius, rise * radius * 0.75, z + Math.sin(angle) * out * radius);
  };
  const leaves = BUSHES.flatMap(({ x, z, radius }) =>
    Array.from({ length: Math.round(radius * LEAVES_PER_RADIUS) }, () =>
      place(
        onDome(x, z, radius * 1.02, 0.05),
        [random() * Math.PI, random() * Math.PI * 2, random() * Math.PI],
        [0.014, 0.004, 0.028].map((size) => size * (0.7 + random() * 0.6)) as [number, number, number],
      ),
    ),
  );
  const roses = BUSHES.flatMap(({ x, z, radius, roses }) =>
    Array.from({ length: roses }, () => {
      const at = onDome(x, z, radius * 1.05, 0.35);
      // Blooms face out from the bush and up a little, towards the light.
      const lean = Math.atan2(Math.hypot(at.x - x, at.z - z), radius * 0.6);
      const heading = Math.atan2(at.x - x, at.z - z);
      const size = 0.05 + random() * 0.025;
      return place(at, [lean * Math.cos(heading), 0, -lean * Math.sin(heading)], [size, size, size]);
    }),
  );
  const up = new Vector3(0, 1, 0);
  const thorns = VINES.flatMap((points) => {
    const curve = vineCurve(points);
    return Array.from({ length: THORNS_PER_VINE }, (_, index) => {
      const u = (index + 0.5) / THORNS_PER_VINE;
      const tangent = curve.getTangentAt(u);
      const side = tangent
        .clone()
        .cross(new Vector3(random() - 0.5, random() - 0.5, random() - 0.5))
        .normalize();
      const placement = new Object3D();
      placement.position.copy(curve.getPointAt(u));
      placement.quaternion.copy(new Quaternion().setFromUnitVectors(up, side));
      placement.updateMatrix();
      return placement;
    });
  });
  return { leaves, roses, thorns };
}

/** A vine through its [x, z] points, crawling low and arching up a little between them. */
function vineCurve(points: [number, number][]) {
  return new CatmullRomCurve3(
    points.map(([x, z], index) => new Vector3(x, index % 2 ? 0.035 : 0.01, z)),
    false,
    "catmullrom",
    0.4,
  );
}

/** A rose about 1 across: three cups of petals, scalloped and opening outwards, round a tight bud. */
function roseGeometry() {
  const cups = [
    { radius: 0.5, height: 0.5, lobes: 5 },
    { radius: 0.36, height: 0.6, lobes: 4 },
    { radius: 0.22, height: 0.68, lobes: 3 },
  ].map(({ radius, height, lobes }, layer) => {
    const profile = [
      new Vector2(0.03, 0),
      new Vector2(radius * 0.55, height * 0.2),
      new Vector2(radius * 0.92, height * 0.6),
      new Vector2(radius, height),
    ];
    const cup = new LatheGeometry(profile, 15);
    const position = cup.getAttribute("position");
    for (let index = 0; index < position.count; index++) {
      const [x, y, z] = [position.getX(index), position.getY(index), position.getZ(index)];
      const petal = Math.cos(Math.atan2(z, x) * lobes + layer * 0.9);
      // Petal tips rise and flare at the rim, the gaps between them dip.
      const rim = y / height;
      const flare = 1 + 0.18 * petal * rim;
      position.setXYZ(index, x * flare, y * (1 + 0.15 * petal * rim), z * flare);
    }
    cup.computeVertexNormals();
    return cup;
  });
  const bud = new SphereGeometry(0.12, 10, 8).scale(1, 1.4, 1).translate(0, 0.5, 0);
  const merged = mergeGeometries([...cups, bud]);
  [...cups, bud].forEach((part) => part.dispose());
  return merged;
}

/** A small rounded petal, about 0.035 long. */
function petalGeometry() {
  const shape = new Shape();
  shape.moveTo(0, -0.017);
  shape.bezierCurveTo(0.016, -0.01, 0.014, 0.012, 0, 0.018);
  shape.bezierCurveTo(-0.014, 0.012, -0.016, -0.01, 0, -0.017);
  return new ShapeGeometry(shape, 6);
}

/** The ritual circle in blood: rings, a seven-pointed star, glyphs between the rings and drips around them. */
function paintBloodCircle(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(107);
  const centre = size / 2;
  const blood = () =>
    `rgba(${120 + random() * 50},${4 + random() * 10},${16 + random() * 14},${0.75 + random() * 0.2})`;
  context.lineCap = context.lineJoin = "round";
  const ring = (radius: number, width: number) => {
    // Painted by hand: a few overlapping strokes, never a clean line.
    for (let pass = 0; pass < 3; pass++) {
      context.strokeStyle = blood();
      context.lineWidth = width * (0.6 + random() * 0.6);
      context.beginPath();
      for (let step = 0; step <= 64; step++) {
        const angle = (step / 64) * Math.PI * 2;
        const wobble = radius + (random() - 0.5) * 2.5;
        context.lineTo(centre + Math.cos(angle) * wobble, centre + Math.sin(angle) * wobble);
      }
      context.stroke();
    }
  };
  ring(size * 0.46, 5);
  ring(size * 0.4, 3);
  ring(size * 0.2, 3);
  const points = 7;
  context.strokeStyle = blood();
  context.lineWidth = 3;
  context.beginPath();
  for (let step = 0; step <= points; step++) {
    const angle = ((step * 3) / points) * Math.PI * 2 - Math.PI / 2;
    context.lineTo(centre + Math.cos(angle) * size * 0.4, centre + Math.sin(angle) * size * 0.4);
  }
  context.stroke();
  for (let glyph = 0; glyph < 21; glyph++) {
    const angle = (glyph / 21) * Math.PI * 2;
    const x = centre + Math.cos(angle) * size * 0.43;
    const y = centre + Math.sin(angle) * size * 0.43;
    context.strokeStyle = blood();
    context.lineWidth = 2;
    context.beginPath();
    for (let stroke = 0; stroke < 3; stroke++) {
      context.moveTo(x + (random() - 0.5) * 10, y + (random() - 0.5) * 10);
      context.lineTo(x + (random() - 0.5) * 10, y + (random() - 0.5) * 10);
    }
    context.stroke();
  }
  for (let drop = 0; drop < 70; drop++) {
    const angle = random() * Math.PI * 2;
    const radius = size * (0.15 + random() * 0.33);
    context.fillStyle = blood();
    context.beginPath();
    context.arc(
      centre + Math.cos(angle) * radius,
      centre + Math.sin(angle) * radius,
      1 + random() * 3.5,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
}

const SOIL: NoiseLook = { base: [30, 18, 17], dark: [10, 6, 6], light: [58, 36, 30], fadeOut: true };
