"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DodecahedronGeometry,
  DoubleSide,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SpriteMaterial,
  type Group,
  type Mesh,
  type Sprite,
} from "three";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom } from "@/game/domain/random";
import { GROUND_RADIUS, grassTuft, scatterAround } from "./sceneryKit";
import { withDressing, type GroundDressing } from "./groundDressing";
import { useCanvasTexture, useNoiseTexture, type NoiseLook, type Painter } from "./textures";

/** Crags of the summit behind him (`height` above the ground, sunk a little), and loose boulders. */
const CRAGS = [
  { x: -0.66, z: -0.62, size: 0.26, height: 0.42, turn: 0.4 },
  { x: -0.38, z: -0.86, size: 0.18, height: 0.26, turn: 1.2 },
  { x: 0.5, z: -0.78, size: 0.24, height: 0.34, turn: 2.1 },
  { x: 0.78, z: -0.4, size: 0.14, height: 0.18, turn: 0.8 },
  { x: -0.82, z: 0.12, size: 0.08, height: 0.08, turn: 2.6 },
  { x: 0.62, z: 0.3, size: 0.06, height: 0.06, turn: 1.7 },
  { x: 0.16, z: -0.62, size: 0.07, height: 0.07, turn: 0.2 },
];
/** A cairn of flat stones, bottom up: size and how far each sits off the one below. */
const CAIRN = { x: 0.2, z: -0.86, stones: [0.11, 0.085, 0.07, 0.05, 0.035] };
const TUFTS = 24;
/** The four elements circling him, a quarter turn apart. */
const ORBIT = { radius: 0.64, height: 0.55, speed: 0.22 };
const LEAVES = 30;
const LEAF_HEIGHT = 2;
const LEAF_TINTS = ["#86efac", "#4ade80", "#a3e635", "#d9f99d", "#65a30d"].map((hex) => new Color(hex));
const STREAKS = 6;
const CLOUDS = 7;
/** Side limit for what drifts: the canvas bleeds past the stage's box and would spill over the page. */
const HALF_WIDTH = 0.8;

/**
 * Zéfiro's stage instead of the rune pedestal: a windswept summit, crags and a cairn, grass bent by the wind,
 * the four elements circling him, leaves caught in a rising spiral and wind streaks. Origin on the floor.
 */
export function WindPeak() {
  const ground = useCanvasTexture({ size: 512, draw: paintPeakFloor, seed: 107, fadeFrom: 0.45 });
  const stone = useNoiseTexture(STONE);
  const materials = useMemo(
    () => ({
      ground: new MeshStandardMaterial({ map: ground, transparent: true, roughness: 1, depthWrite: false }),
      rock: new MeshStandardMaterial({ map: stone, roughness: 0.95, flatShading: true }),
      lichen: new MeshStandardMaterial({ color: "#7d8f5a", roughness: 1, flatShading: true }),
    }),
    [ground, stone],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const rock = useMemo(() => new DodecahedronGeometry(1, 0), []);
  useEffect(() => () => rock.dispose(), [rock]);

  return (
    <group>
      <mesh material={materials.ground} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {CRAGS.map(({ x, z, size, height, turn }) => (
        <group key={`${x}:${z}`} position={[x, height * 0.35, z]} rotation-y={turn}>
          <mesh geometry={rock} material={materials.rock} scale={[size, height * 0.75, size * 0.8]} />
          {/* Lichen on the side the weather doesn't scour. */}
          {size > 0.1 && (
            <mesh
              geometry={rock}
              material={materials.lichen}
              position={[0, height * 0.32, 0]}
              scale={[size * 0.7, height * 0.12, size * 0.55]}
            />
          )}
        </group>
      ))}
      <group position={[CAIRN.x, 0, CAIRN.z]}>
        {CAIRN.stones.map((size, index) => {
          const y = CAIRN.stones.slice(0, index).reduce((sum, below) => sum + below * 0.72, 0) + size * 0.38;
          return (
            <mesh
              key={index}
              geometry={rock}
              material={materials.rock}
              position={[(index % 2 ? 0.01 : -0.008) * index, y, 0]}
              rotation-y={index * 1.3}
              scale={[size, size * 0.38, size * 0.85]}
            />
          );
        })}
      </group>
      <WindsweptGrass />
      <Elements />
      <LeafSpiral />
      <WindStreaks />
      <LowClouds />
    </group>
  );
}

/** Grass flattened towards +X by the wind, rippling as gusts pass through. */
function WindsweptGrass() {
  const { variants, tufts } = useMemo(() => {
    const random = seededRandom(109);
    const root = new Color("#3d4a24");
    const tip = new Color("#b5d47a");
    const variants = [0, 1, 2].map(() => grassTuft(random, 8, 0.12, root, tip));
    const tufts = scatterAround(random, TUFTS, 0.3, 0.92).map(([x, z], index) => ({
      x,
      z,
      variant: index % variants.length,
      size: 0.6 + random() * 0.8,
      turn: random() * Math.PI * 2,
    }));
    return { variants, tufts };
  }, []);
  useEffect(() => () => variants.forEach((variant) => variant.dispose()), [variants]);
  const meshes = useRef<(Group | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    tufts.forEach(({ x }, index) => {
      const tuft = meshes.current[index];
      // The gust travels across the stage, so neighbouring tufts bend one after the other.
      const gust = 0.5 + 0.5 * Math.sin(t * 1.2 - x * 3);
      if (tuft) tuft.rotation.z = -(0.12 + 0.2 * gust + 0.04 * Math.sin(t * 7 + index));
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

/** Air, water, earth and fire: four small tokens slowly circling him, each moving in its own way. */
function Elements() {
  const disc = useSoftDisc();
  const parts = useMemo(
    () => ({
      air: new MeshBasicMaterial({ color: "#f0fdf4", transparent: true, opacity: 0.35, depthWrite: false }),
      airRing: new MeshBasicMaterial({ color: "#dcfce7", transparent: true, opacity: 0.6, depthWrite: false }),
      water: new MeshStandardMaterial({
        color: "#38bdf8",
        emissive: "#0c4a6e",
        emissiveIntensity: 0.6,
        roughness: 0.05,
        transparent: true,
        opacity: 0.85,
      }),
      earth: new MeshStandardMaterial({ color: "#7c5a36", roughness: 1, flatShading: true }),
      moss: new MeshStandardMaterial({ color: "#4d7c0f", roughness: 1, flatShading: true }),
      flame: new SpriteMaterial({
        map: disc,
        color: new Color("#ff9d3d").multiplyScalar(2),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      core: new SpriteMaterial({
        map: disc,
        color: new Color("#fff2b0").multiplyScalar(2),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      halo: [
        ["#ecfdf5", 0.18],
        ["#7dd3fc", 0.2],
        ["#a3e635", 0.12],
        ["#fb923c", 0.28],
      ].map(
        ([color, opacity]) =>
          new SpriteMaterial({
            map: disc,
            color: color as string,
            opacity: opacity as number,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
          }),
      ),
      stone: new DodecahedronGeometry(1, 0),
    }),
    [disc],
  );
  useEffect(
    () => () =>
      Object.values(parts)
        .flat()
        .forEach((part) => part.dispose()),
    [parts],
  );
  const tokens = useRef<(Group | null)[]>([]);
  const spinners = useRef<(Object3D | null)[]>([]);
  const flames = useRef<(Sprite | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    tokens.current.forEach((token, index) => {
      if (!token) return;
      const at = t * ORBIT.speed + (index * Math.PI) / 2;
      token.position.set(
        Math.cos(at) * ORBIT.radius,
        ORBIT.height + 0.05 * Math.sin(t * 0.9 + index * 1.6),
        Math.sin(at) * ORBIT.radius,
      );
    });
    const [ring, water, earth] = spinners.current;
    if (ring) ring.rotation.set(1.1 + 0.2 * Math.sin(t), t * 3, 0);
    // Water wobbles like a held droplet.
    if (water) water.scale.set(1 + 0.08 * Math.sin(t * 4), 1 - 0.08 * Math.sin(t * 4), 1 + 0.05 * Math.cos(t * 3));
    if (earth) earth.rotation.set(t * 0.4, t * 0.7, 0);
    const [flame, core] = flames.current;
    const flicker = 1 + 0.15 * Math.sin(t * 13) + 0.1 * Math.sin(t * 31);
    flame?.scale.set(0.06 * flicker, 0.09 * (2 - flicker), 1);
    core?.scale.set(0.03 * flicker, 0.04 * flicker, 1);
  });

  const token = (index: number) => (group: Group | null) => {
    tokens.current[index] = group;
  };
  const spinner = (index: number) => (object: Object3D | null) => {
    spinners.current[index] = object;
  };

  return (
    <>
      <group ref={token(0)}>
        <mesh material={parts.air}>
          <sphereGeometry args={[0.03, 16, 12]} />
        </mesh>
        <mesh ref={spinner(0)} material={parts.airRing}>
          <torusGeometry args={[0.045, 0.004, 6, 32]} />
        </mesh>
        <sprite material={parts.halo[0]} scale={0.22} />
      </group>
      <group ref={token(1)}>
        <mesh ref={spinner(1)} material={parts.water}>
          <sphereGeometry args={[0.032, 20, 14]} />
        </mesh>
        <sprite material={parts.halo[1]} scale={0.22} />
      </group>
      <group ref={token(2)}>
        <group ref={spinner(2)}>
          <mesh geometry={parts.stone} material={parts.earth} scale={0.034} />
          <mesh geometry={parts.stone} material={parts.moss} position-y={0.018} scale={[0.024, 0.01, 0.022]} />
        </group>
        <sprite material={parts.halo[2]} scale={0.2} />
      </group>
      <group ref={token(3)}>
        <sprite
          ref={(sprite) => {
            flames.current[0] = sprite;
          }}
          material={parts.flame}
          position-y={0.01}
        />
        <sprite
          ref={(sprite) => {
            flames.current[1] = sprite;
          }}
          material={parts.core}
        />
        <sprite material={parts.halo[3]} scale={0.26} />
      </group>
    </>
  );
}

/** Leaves carried up round him in a widening funnel, tumbling: one instanced draw. */
function LeafSpiral() {
  const texture = useCanvasTexture({ size: 64, height: 40, draw: paintLeaf, linear: true });
  const { mesh, leaves } = useMemo(() => {
    const random = seededRandom(113);
    const geometry = new PlaneGeometry(0.05, 0.03);
    const material = new MeshStandardMaterial({ map: texture, alphaTest: 0.5, side: DoubleSide, roughness: 0.8 });
    const mesh = new InstancedMesh(geometry, material, LEAVES);
    const leaves = Array.from({ length: LEAVES }, (_, index) => {
      mesh.setColorAt(index, LEAF_TINTS[index % LEAF_TINTS.length]);
      return {
        angle: random() * Math.PI * 2,
        height: random() * LEAF_HEIGHT,
        rise: 0.18 + random() * 0.16,
        spin: 0.9 + random() * 0.6,
        inner: 0.3 + random() * 0.15,
        tumble: [random() * 3, random() * 3, random() * 3],
        size: 0.7 + random() * 0.6,
      };
    });
    return { mesh, leaves };
  }, [texture]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as MeshStandardMaterial).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  const dummy = useMemo(() => new Object3D(), []);
  const instances = useRef<InstancedMesh>(null);

  useFrame(({ clock }, delta) => {
    const leafMesh = instances.current;
    if (!leafMesh) return;
    const t = clock.elapsedTime;
    leaves.forEach((leaf, index) => {
      leaf.height += leaf.rise * delta;
      leaf.angle += leaf.spin * delta;
      if (leaf.height > LEAF_HEIGHT) leaf.height -= LEAF_HEIGHT;
      const radius = leaf.inner + leaf.height * 0.22;
      const x = Math.max(-HALF_WIDTH, Math.min(HALF_WIDTH, Math.cos(leaf.angle) * radius));
      dummy.position.set(x, leaf.height, Math.sin(leaf.angle) * radius);
      dummy.rotation.set(t * leaf.tumble[0], t * leaf.tumble[1], t * leaf.tumble[2]);
      // Grows in from the ground and shrinks away at the top, so the loop is not seen.
      dummy.scale.setScalar(leaf.size * Math.min(1, leaf.height * 4, (LEAF_HEIGHT - leaf.height) * 2));
      dummy.updateMatrix();
      leafMesh.setMatrixAt(index, dummy.matrix);
    });
    leafMesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive ref={instances} object={mesh} />;
}

/** Thin streaks of air racing across behind him, faded in and out at the sides. */
function WindStreaks() {
  const disc = useSoftDisc();
  const streaks = useRef<(Mesh | null)[]>([]);
  const lines = useMemo(() => {
    const random = seededRandom(127);
    return Array.from({ length: STREAKS }, () => ({
      y: 0.25 + random() * 1.4,
      z: -0.55 - random() * 0.4,
      speed: 0.6 + random() * 0.5,
      offset: random() * 2,
      length: 0.3 + random() * 0.35,
    }));
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    lines.forEach(({ y, z, speed, offset }, index) => {
      const streak = streaks.current[index];
      if (!streak) return;
      // Each crossing then a pause off stage, so they come in irregular gusts.
      const run = ((t * speed + offset) % 3) - 1.5;
      streak.position.set(run * HALF_WIDTH * 1.2, y + 0.03 * Math.sin(run * 4), z);
      const material = streak.material as MeshBasicMaterial;
      material.opacity = 0.22 * Math.max(0, 1 - Math.abs(run) / 1.1);
    });
  });

  return (
    <>
      {lines.map(({ length }, index) => (
        <mesh key={index} ref={(mesh) => void (streaks.current[index] = mesh)} scale={[length, 0.012, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={disc}
            color="#f0fff4"
            transparent
            opacity={0}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

/** Cloud tops just below the summit's rim, drifting with the wind: the peak is high. */
function LowClouds() {
  const disc = useSoftDisc();
  const puffs = useRef<(Mesh | null)[]>([]);
  const clouds = useMemo(() => {
    const random = seededRandom(131);
    return Array.from({ length: CLOUDS }, () => ({
      x: (random() - 0.5) * 2 * HALF_WIDTH,
      z: -0.75 - random() * 0.3,
      y: -0.12 + random() * 0.08,
      size: 0.4 + random() * 0.3,
      speed: 0.03 + random() * 0.03,
    }));
  }, []);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    clouds.forEach(({ x, y, z, size, speed }, index) => {
      const puff = puffs.current[index];
      if (!puff) return;
      const span = 2 * HALF_WIDTH;
      const at = ((x + t * speed + HALF_WIDTH) % span) - HALF_WIDTH;
      puff.position.set(at, y, z);
      // Narrowed and faded at the sides so no puff spills past the stage.
      puff.scale.setScalar(Math.max(0.1, Math.min(size, 2 * (HALF_WIDTH - Math.abs(at)))));
      (puff.material as MeshBasicMaterial).opacity = 0.4 * Math.min(1, (HALF_WIDTH - Math.abs(at)) * 4);
      puff.quaternion.copy(camera.quaternion);
    });
  });

  return (
    <>
      {clouds.map((_, index) => (
        <mesh key={index} ref={(mesh) => void (puffs.current[index] = mesh)} renderOrder={-2}>
          <planeGeometry args={[1, 0.5]} />
          <meshBasicMaterial map={disc} color="#f1f5f9" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

/** Bare summit rock with cracks, grit and patches of hardy grass, fading out towards the rim. */
const paintSummitFloor: Painter = (context, size, random) => {
  context.fillStyle = "#5a5a52";
  context.fillRect(0, 0, size, size);
  const blot = (x: number, y: number, radius: number, colour: string) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  for (let index = 0; index < 90; index++) {
    blot(
      random() * size,
      random() * size,
      20 + random() * 40,
      random() < 0.5 ? "rgba(40,40,36,0.5)" : "rgba(120,118,106,0.45)",
    );
  }
  for (let index = 0; index < 70; index++) {
    blot(random() * size, random() * size, 10 + random() * 26, "rgba(96,122,56,0.6)");
  }
  context.lineCap = "round";
  for (let crack = 0; crack < 26; crack++) {
    let x = random() * size;
    let y = random() * size;
    let angle = random() * Math.PI * 2;
    context.strokeStyle = "rgba(24,24,20,0.6)";
    context.lineWidth = 1 + random() * 1.5;
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 5; step++) {
      angle += (random() - 0.5) * 1.1;
      x += Math.cos(angle) * 12;
      y += Math.sin(angle) * 12;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  for (let index = 0; index < 3200; index++) {
    context.fillStyle = random() < 0.5 ? "rgba(30,30,26,0.4)" : "rgba(150,148,136,0.35)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
};

/** A pointed leaf, white with a darker midrib, tinted per instance. */
const paintLeaf: Painter = (context) => {
  const width = 64;
  const height = 40;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.moveTo(2, height / 2);
  context.quadraticCurveTo(width * 0.45, -height * 0.15, width - 2, height / 2);
  context.quadraticCurveTo(width * 0.45, height * 1.15, 2, height / 2);
  context.fill();
  context.strokeStyle = "rgba(90,110,80,0.9)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(2, height / 2);
  context.lineTo(width - 6, height / 2);
  context.stroke();
};

const STONE: NoiseLook = { base: [92, 90, 82], dark: [48, 48, 42], light: [140, 138, 126], fadeOut: false };

/** A goat track over the summit rock, leaves blown in by the wind and loose pebbles. */
const PEAK_GROUND: GroundDressing = {
  wash: { colour: "#86efac", alpha: 0.22 },
  path: { kind: "dirt", colour: "rgba(128,120,100,0.9)", edge: "rgba(70,66,56,0.55)", width: [0.1, 0.22], wind: 0.07 },
  litter: [
    { shape: "leaf", colours: ["#86efac", "#4ade80", "#bbf7d0"], count: 110, size: 4 },
    { shape: "pebble", colours: ["#8a8678", "#5f5c52"], count: 60, size: 3 },
  ],
};
const paintPeakFloor = withDressing(paintSummitFloor, PEAK_GROUND);
