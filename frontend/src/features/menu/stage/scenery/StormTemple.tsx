"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  LatheGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  QuadraticBezierCurve3,
  SpriteMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom } from "@/game/domain/random";
import { GROUND_RADIUS, scatterAround } from "./sceneryKit";
import { withDressing, type GroundDressing } from "./groundDressing";
import { useCanvasTexture, useNoiseTexture, type NoiseLook, type Painter } from "./textures";

/** The low parapet closing the terrace behind him: blocks along the back arc (angles in radians, -π/2 straight back). */
const PARAPET = { radius: 0.9, from: -2.55, to: -0.59, blocks: 7, height: 0.11, depth: 0.08 };
const BURNER = { x: -0.5, z: -0.48 };
const BELL_FRAME = { x: 0.5, z: -0.62, turn: -0.45, width: 0.36, height: 0.82 };
/** Prayer flags strung from a pole on his left to the bell frame, in their five colours. */
const FLAG_LINE = { from: new Vector3(-0.78, 0.98, -0.3), to: new Vector3(0.36, 0.86, -0.72), sag: 0.12 };
const FLAG_COLOURS = ["#2563eb", "#f8fafc", "#dc2626", "#16a34a", "#facc15"];
const FLAGS = 10;
const PUFFS = 10;
const SMOKE_RISE = 1.1;
const PEBBLES = 36;
/** Seconds between lightning strikes; each strike flickers a few times. */
const STRIKE_EVERY = 6.5;
const FLICKERS = [
  { at: 0, length: 0.08 },
  { at: 0.16, length: 0.06 },
  { at: 0.34, length: 0.12 },
];
const BOLT = new Color("#fff6c8").multiplyScalar(2);

/**
 * The Wandering Sage's stage instead of the rune pedestal: a mountain monastery terrace of worn slabs, a stone
 * censer smoking, a bronze bell in its frame, prayer flags, and lightning flickering in the sky. Origin on the floor.
 */
export function StormTemple() {
  const floor = useCanvasTexture({ size: 512, draw: paintTerraceFloor, seed: 139, fadeFrom: 0.5 });
  const stone = useNoiseTexture(STONE);
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: floor, transparent: true, roughness: 0.95, depthWrite: false }),
      // Two-sided so the inside of the censer's bowl shows.
      stone: new MeshStandardMaterial({ map: stone, roughness: 0.95, side: DoubleSide }),
      wood: new MeshStandardMaterial({ color: "#5a2e1c", roughness: 0.8 }),
      roof: new MeshStandardMaterial({ color: "#2f3a33", roughness: 0.7 }),
      bronze: new MeshStandardMaterial({ color: "#a8733a", metalness: 0.85, roughness: 0.38, side: DoubleSide }),
      ash: new MeshStandardMaterial({ color: "#3a3631", roughness: 1 }),
      rope: new MeshStandardMaterial({ color: "#c9b48a", roughness: 1 }),
    }),
    [floor, stone],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const blocks = useMemo(
    () =>
      Array.from({ length: PARAPET.blocks }, (_, index) => {
        const angle = PARAPET.from + ((index + 0.5) / PARAPET.blocks) * (PARAPET.to - PARAPET.from);
        const span = ((PARAPET.to - PARAPET.from) / PARAPET.blocks) * PARAPET.radius;
        return { angle, span, worn: index % 3 === 1 };
      }),
    [],
  );

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {blocks.map(({ angle, span, worn }) => (
        <group
          key={angle}
          position={[Math.cos(angle) * PARAPET.radius, 0, Math.sin(angle) * PARAPET.radius]}
          rotation-y={-angle - Math.PI / 2}
        >
          <mesh material={materials.stone} position-y={PARAPET.height / 2}>
            <boxGeometry args={[span * 0.96, PARAPET.height * (worn ? 0.8 : 1), PARAPET.depth]} />
          </mesh>
          <mesh material={materials.stone} position-y={PARAPET.height + 0.012}>
            <boxGeometry args={[span, 0.024, PARAPET.depth * 1.3]} />
          </mesh>
        </group>
      ))}
      <Censer materials={materials} />
      <BellFrame materials={materials} />
      <PrayerFlags rope={materials.rope} wood={materials.wood} />
      <Pebbles />
      <Lightning />
    </group>
  );
}

type TempleMaterials = Record<"stone" | "wood" | "roof" | "bronze" | "ash" | "rope", MeshStandardMaterial>;

/** A round stone censer on three feet with incense burning, its smoke curling up and away. */
function Censer({ materials }: { materials: TempleMaterials }) {
  const disc = useSoftDisc();
  const bowl = useMemo(
    () =>
      new LatheGeometry(
        [
          [0, 0],
          [0.05, 0.004],
          [0.085, 0.03],
          [0.095, 0.07],
          [0.088, 0.09],
          [0.08, 0.088],
          [0.07, 0.075],
        ].map(([x, y]) => new Vector2(x, y)),
        20,
      ),
    [],
  );
  useEffect(() => () => bowl.dispose(), [bowl]);
  const glow = useMemo(
    () => ({
      ember: new SpriteMaterial({
        map: disc,
        color: new Color("#ff7a2e").multiplyScalar(2),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      smoke: Array.from(
        { length: PUFFS },
        () => new MeshBasicMaterial({ map: disc, color: "#d8d2c8", transparent: true, depthWrite: false }),
      ),
    }),
    [disc],
  );
  useEffect(() => () => [glow.ember, ...glow.smoke].forEach((material) => material.dispose()), [glow]);
  const puffs = useRef<(Mesh | null)[]>([]);
  const sticks = [-0.012, 0.006, 0.018];

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    puffs.current.forEach((puff, index) => {
      if (!puff) return;
      const age = ((t * 0.16 + index / PUFFS) % 1) * SMOKE_RISE;
      const rise = age / SMOKE_RISE;
      // Curls as it climbs and drifts off to the side the wind takes it.
      puff.position.set(
        Math.sin(t * 0.8 + index * 1.3) * 0.03 * rise * 4 + rise * 0.12,
        0.26 + age,
        Math.cos(t * 0.6 + index) * 0.02 * rise * 4,
      );
      puff.scale.setScalar(0.05 + rise * 0.28);
      puff.quaternion.copy(camera.quaternion);
      glow.smoke[index].setValues({ opacity: 0.32 * Math.min(1, rise * 6) * (1 - rise) });
    });
  });

  return (
    <group position={[BURNER.x, 0, BURNER.z]}>
      <mesh material={materials.stone} position-y={0.03}>
        <boxGeometry args={[0.22, 0.06, 0.22]} />
      </mesh>
      {[0, 1, 2].map((foot) => {
        const angle = (foot / 3) * Math.PI * 2 + 0.3;
        return (
          <mesh
            key={foot}
            material={materials.bronze}
            position={[Math.cos(angle) * 0.055, 0.075, Math.sin(angle) * 0.055]}
          >
            <cylinderGeometry args={[0.012, 0.016, 0.03, 8]} />
          </mesh>
        );
      })}
      <group position-y={0.088}>
        <mesh geometry={bowl} material={materials.stone} />
        {/* Handles on either side. */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            material={materials.bronze}
            position-x={side * 0.1}
            position-y={0.07}
            rotation-y={Math.PI / 2}
          >
            <torusGeometry args={[0.018, 0.005, 6, 12, Math.PI]} />
          </mesh>
        ))}
        <mesh material={materials.ash} position-y={0.072} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.07, 20]} />
        </mesh>
        {sticks.map((x, index) => (
          <group key={x} position={[x, 0.072, (index - 1) * 0.01]} rotation-z={(index - 1) * 0.15}>
            <mesh material={materials.wood} position-y={0.05}>
              <cylinderGeometry args={[0.0018, 0.0018, 0.1, 4]} />
            </mesh>
            <sprite material={glow.ember} position-y={0.1} scale={0.018} />
          </group>
        ))}
      </group>
      {glow.smoke.map((material, index) => (
        <mesh key={index} ref={(mesh) => void (puffs.current[index] = mesh)} material={material} renderOrder={3}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  );
}

/** Two lacquered posts under a small tiled roof, a bronze bell hanging between them, barely swinging. */
function BellFrame({ materials }: { materials: TempleMaterials }) {
  const { x, z, turn, width, height } = BELL_FRAME;
  const bell = useMemo(
    () =>
      new LatheGeometry(
        [
          [0.0, 0.2],
          [0.035, 0.2],
          [0.05, 0.18],
          [0.055, 0.1],
          [0.068, 0.03],
          [0.08, 0.0],
          [0.074, 0.0],
        ].map(([px, py]) => new Vector2(px, py)),
        24,
      ),
    [],
  );
  useEffect(() => () => bell.dispose(), [bell]);
  const swing = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (swing.current) swing.current.rotation.z = 0.035 * Math.sin(clock.elapsedTime * 1.1);
  });

  return (
    <group position={[x, 0, z]} rotation-y={turn}>
      {[-1, 1].map((side) => (
        <group key={side} position-x={(side * width) / 2}>
          <mesh material={materials.stone} position-y={0.03}>
            <boxGeometry args={[0.07, 0.06, 0.07]} />
          </mesh>
          <mesh material={materials.wood} position-y={height / 2}>
            <boxGeometry args={[0.032, height, 0.032]} />
          </mesh>
        </group>
      ))}
      <mesh material={materials.wood} position-y={height - 0.04}>
        <boxGeometry args={[width + 0.08, 0.035, 0.04]} />
      </mesh>
      {/* The roof: two pitches meeting at a ridge, eaves turned up at the ends. */}
      {[-1, 1].map((side) => (
        <mesh key={side} material={materials.roof} position={[0, height + 0.03, side * 0.05]} rotation-x={side * 0.55}>
          <boxGeometry args={[width + 0.2, 0.014, 0.12]} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          material={materials.roof}
          position={[(side * (width + 0.2)) / 2, height + 0.05, 0]}
          rotation-z={side * -0.5}
        >
          <boxGeometry args={[0.05, 0.014, 0.16]} />
        </mesh>
      ))}
      <group ref={swing} position-y={height - 0.06}>
        <mesh material={materials.rope} position-y={-0.025}>
          <cylinderGeometry args={[0.004, 0.004, 0.05, 5]} />
        </mesh>
        <mesh geometry={bell} material={materials.bronze} position-y={-0.25} />
      </group>
    </group>
  );
}

/** A sagging cord of small flags in the five colours, each fluttering on its own. */
function PrayerFlags({ rope, wood }: { rope: MeshStandardMaterial; wood: MeshStandardMaterial }) {
  const { cord, flag, flags } = useMemo(() => {
    const middle = FLAG_LINE.from.clone().lerp(FLAG_LINE.to, 0.5);
    middle.y -= FLAG_LINE.sag * 2;
    const curve = new QuadraticBezierCurve3(FLAG_LINE.from, middle, FLAG_LINE.to);
    const cord = new TubeGeometry(curve, 24, 0.0025, 4, false);
    const flag = new PlaneGeometry(0.06, 0.075, 2, 1);
    // Hung from its top edge.
    flag.translate(0, -0.0375, 0);
    const along = FLAG_LINE.to.clone().sub(FLAG_LINE.from);
    const heading = Math.atan2(-along.z, along.x);
    const flags = Array.from({ length: FLAGS }, (_, index) => ({
      at: curve.getPoint((index + 0.75) / (FLAGS + 0.5)),
      colour: FLAG_COLOURS[index % FLAG_COLOURS.length],
      heading,
    }));
    return { cord, flag, flags };
  }, []);
  useEffect(
    () => () => {
      cord.dispose();
      flag.dispose();
    },
    [cord, flag],
  );
  const pieces = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    pieces.current.forEach((piece, index) => {
      if (!piece) return;
      piece.rotation.x = -0.25 - 0.2 * Math.sin(t * 2.2 + index * 0.9) - 0.08 * Math.sin(t * 5.3 + index);
      piece.rotation.y = 0.12 * Math.sin(t * 1.7 + index * 1.3);
    });
  });

  return (
    <>
      <mesh geometry={cord} material={rope} />
      <mesh material={wood} position={[FLAG_LINE.from.x, FLAG_LINE.from.y / 2, FLAG_LINE.from.z]}>
        <cylinderGeometry args={[0.012, 0.016, FLAG_LINE.from.y, 6]} />
      </mesh>
      {flags.map(({ at, colour, heading }, index) => (
        <group key={index} position={at} rotation-y={heading}>
          <mesh geometry={flag} ref={(mesh) => void (pieces.current[index] = mesh)}>
            <meshStandardMaterial color={colour} roughness={0.9} side={DoubleSide} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Loose pebbles round the terrace's edge: one instanced draw. */
function Pebbles() {
  const mesh = useMemo(() => {
    const random = seededRandom(149);
    const result = new InstancedMesh(
      new DodecahedronGeometry(1, 0),
      new MeshStandardMaterial({ roughness: 0.95, flatShading: true }),
      PEBBLES,
    );
    const dummy = new Object3D();
    const shade = new Color();
    scatterAround(random, PEBBLES, 0.35, 0.88).forEach(([x, z], index) => {
      const size = 0.01 + random() * 0.018;
      dummy.position.set(x, size * 0.3, z);
      dummy.rotation.set(random() * 3, random() * 3, random() * 3);
      dummy.scale.set(size * (1 + random() * 0.5), size * 0.6, size);
      dummy.updateMatrix();
      result.setMatrixAt(index, dummy.matrix);
      const grey = 0.32 + random() * 0.25;
      result.setColorAt(index, shade.setRGB(grey * 1.05, grey, grey * 0.92));
    });
    return result;
  }, []);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as MeshStandardMaterial).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} />;
}

/** Bolts far behind the terrace, dark until a strike flickers one of them on, the clouds lit round it. */
function Lightning() {
  const disc = useSoftDisc();
  const bolts = useMemo(() => [boltGeometry(157, 0.38, -0.5), boltGeometry(163, -0.42, 0.45)], []);
  useEffect(() => () => bolts.forEach((bolt) => bolt.dispose()), [bolts]);
  const materials = useMemo(
    () => ({
      bolt: new MeshBasicMaterial({
        color: BOLT,
        transparent: true,
        opacity: 0,
        side: DoubleSide,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      sky: new MeshBasicMaterial({
        map: disc,
        color: "#fde68a",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    }),
    [disc],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const meshes = useRef<(Mesh | null)[]>([]);
  const glow = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const strike = Math.floor(t / STRIKE_EVERY);
    const since = t - strike * STRIKE_EVERY;
    const flash = FLICKERS.reduce(
      (most, { at, length }) => Math.max(most, since >= at && since < at + length ? 1 - (since - at) / length / 2 : 0),
      0,
    );
    const which = strike % bolts.length;
    meshes.current.forEach((mesh, index) => {
      if (mesh) mesh.visible = index === which && flash > 0;
    });
    materials.bolt.setValues({ opacity: flash });
    materials.sky.setValues({ opacity: flash * 0.35 });
    glow.current?.position.set(which ? -0.4 : 0.4, 2.1, -1.5);
  });

  return (
    <>
      <mesh ref={glow} material={materials.sky} scale={[1.6, 1.1, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {bolts.map((geometry, index) => (
        <mesh
          key={index}
          ref={(mesh) => void (meshes.current[index] = mesh)}
          geometry={geometry}
          material={materials.bolt}
          visible={false}
        />
      ))}
    </>
  );
}

/**
 * A jagged bolt with a fork, as a flat ribbon facing the camera, from high in the sky at `x` down towards the
 * horizon behind the terrace; `drift` is how far sideways it wanders on the way.
 */
function boltGeometry(seed: number, x: number, drift: number): BufferGeometry {
  const random = seededRandom(seed);
  const positions: number[] = [];
  const ribbon = (points: Vector3[], width: number) => {
    // Each point's own sideways offset from its neighbours, so the segments join without gaps.
    const edges = points.map((point, index) => {
      const ahead = points[Math.min(index + 1, points.length - 1)];
      const behind = points[Math.max(index - 1, 0)];
      const across = new Vector2(ahead.y - behind.y, behind.x - ahead.x)
        .normalize()
        .multiplyScalar(width * (1 - index / points.length));
      return [
        [point.x - across.x, point.y - across.y, point.z],
        [point.x + across.x, point.y + across.y, point.z],
      ];
    });
    for (let index = 0; index < edges.length - 1; index++) {
      const [a, b] = edges[index];
      const [c, d] = edges[index + 1];
      positions.push(...a, ...b, ...d, ...a, ...d, ...c);
    }
  };
  const path = (from: Vector3, steps: number, length: number, lean: number) =>
    Array.from({ length: steps + 1 }, (_, index) => {
      const along = index / steps;
      const kink = index && index < steps ? (random() - 0.5) * 0.12 : 0;
      return new Vector3(from.x + lean * along + kink, from.y - length * along, from.z);
    });
  const main = path(new Vector3(x, 2.7, -1.6), 9, 1.4, drift * 0.4);
  ribbon(main, 0.012);
  const fork = main[4];
  ribbon(path(fork.clone(), 5, 0.55, drift * 0.5), 0.007);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geometry;
}

/** Big square slabs worn smooth in the middle, mossy joints and cracks, fading out towards the rim. */
const paintTerraceSlabs: Painter = (context, size, random) => {
  context.fillStyle = "#3f4a32";
  context.fillRect(0, 0, size, size);
  const slab = 92;
  for (let row = -1; row * slab < size; row++) {
    const offset = row % 2 ? slab / 2 : 0;
    for (let column = -1; column * slab < size + slab; column++) {
      const shade = 112 + random() * 34;
      context.fillStyle = `rgb(${shade + 6},${shade},${shade - 10})`;
      context.fillRect(column * slab + offset + 3, row * slab + 3, slab - 6, slab - 6);
    }
  }
  for (let crack = 0; crack < 18; crack++) {
    let x = random() * size;
    let y = random() * size;
    let angle = random() * Math.PI * 2;
    context.strokeStyle = "rgba(40,38,32,0.55)";
    context.lineWidth = 1 + random();
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 4; step++) {
      angle += (random() - 0.5) * 1.2;
      x += Math.cos(angle) * 14;
      y += Math.sin(angle) * 14;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  for (let fleck = 0; fleck < 3600; fleck++) {
    context.fillStyle = random() < 0.5 ? "rgba(50,46,40,0.3)" : "rgba(200,192,176,0.25)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  // Paler where generations of feet have trained on it.
  const worn = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.3);
  worn.addColorStop(0, "rgba(214,206,186,0.35)");
  worn.addColorStop(1, "rgba(214,206,186,0)");
  context.fillStyle = worn;
  context.fillRect(0, 0, size, size);
};

const STONE: NoiseLook = { base: [124, 118, 104], dark: [70, 66, 58], light: [168, 162, 146], fadeOut: false };

/** A saffron prayer carpet across the terrace, marigold petals, and cracks still crackling from the storm. */
const TERRACE_GROUND: GroundDressing = {
  wash: { colour: "#facc15", alpha: 0.2 },
  path: { kind: "runner", colour: "#b4531f", edge: "#f2c14e", width: [0.2, 0.2] },
  litter: [{ shape: "petal", colours: ["#f59e0b", "#fbbf24", "#ea580c"], count: 90, size: 4 }],
  glow: { colour: "#7dd3fc", count: 5 },
};
const paintTerraceFloor = withDressing(paintTerraceSlabs, TERRACE_GROUND);
