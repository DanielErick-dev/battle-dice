"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PlaneGeometry,
  SpriteMaterial,
  type Group,
} from "three";
import { iceShard } from "@/features/match/scene/character/shared/ice";
import { useSoftDisc } from "@/features/match/scene/character/shared/softDisc";
import { seededRandom } from "@/game/domain/random";
import { GROUND_RADIUS, grassTuft, scatterAround } from "./sceneryKit";
import { withDressing, type GroundDressing } from "./groundDressing";
import { useCanvasTexture, type Painter } from "./textures";

/** `height` is the tallest shard's; `violet` clusters take the fairy-light lilac instead of cyan. */
const CLUSTERS = [
  { x: -0.62, z: -0.6, height: 0.82, shards: 6, violet: false },
  { x: 0.12, z: -0.9, height: 0.5, shards: 5, violet: true },
  { x: 0.6, z: -0.62, height: 0.66, shards: 6, violet: false },
  { x: -0.84, z: -0.05, height: 0.28, shards: 3, violet: true },
  { x: 0.82, z: -0.1, height: 0.22, shards: 3, violet: false },
];
const CYAN = new Color("#22d3ee");
const LILAC = new Color("#a78bfa");
/** Crystal motes hovering over the clusters, slowly turning. */
const FLOATERS = [
  { x: -0.5, y: 1.0, z: -0.5, size: 0.035 },
  { x: 0.48, y: 0.85, z: -0.55, size: 0.028 },
  { x: 0.05, y: 0.7, z: -0.82, size: 0.022 },
];
/** The fairy ring of glowing flowers round her feet, then a few more tucked at the crystals' feet. */
const RING_FLOWERS = 15;
const RING_RADIUS = 0.56;
const STRAYS_PER_CLUSTER = 3;
const FLOWER_TINTS = ["#9ff3ff", "#e0fbff", "#c9b8ff", "#7ee8fa"].map((hex) => new Color(hex));
const TUFTS = 12;
const SPARKLES = 64;
const SPARKLE_HEIGHT = 2;

/**
 * The Crystal Fairy's stage instead of the rune pedestal: an enchanted garden under soft snow, glowing cyan and
 * lilac crystals, a fairy ring of shining flowers, hovering crystal motes and sparkles. Origin on the floor.
 */
export function CrystalGrove() {
  const ground = useCanvasTexture({ size: 512, draw: paintGroveFloor, seed: 79, fadeFrom: 0.45 });
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      ground: new MeshStandardMaterial({ map: ground, transparent: true, roughness: 0.85, depthWrite: false }),
      snow: new MeshStandardMaterial({ color: "#eaf8ff", roughness: 0.8 }),
      // Glows from within rather than refracting like Bjorn's glacier ice.
      cyan: new MeshStandardMaterial({
        color: "#8af0ff",
        emissive: CYAN,
        emissiveIntensity: 0.55,
        roughness: 0.12,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
        flatShading: true,
      }),
      lilac: new MeshStandardMaterial({
        color: "#d8ccff",
        emissive: LILAC,
        emissiveIntensity: 0.55,
        roughness: 0.12,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
        flatShading: true,
      }),
      mote: new MeshBasicMaterial({ color: new Color("#c8fbff").multiplyScalar(1.6), toneMapped: false }),
      cyanGlow: new SpriteMaterial({
        map: disc,
        color: CYAN,
        opacity: 0.3,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
      lilacGlow: new SpriteMaterial({
        map: disc,
        color: LILAC,
        opacity: 0.3,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    }),
    [ground, disc],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const mote = useMemo(() => new OctahedronGeometry(1, 0), []);
  useEffect(() => () => mote.dispose(), [mote]);
  const clusters = useMemo(() => {
    const random = seededRandom(83);
    return CLUSTERS.map((cluster) => ({
      ...cluster,
      shards: Array.from({ length: cluster.shards }, (_, index) => {
        const main = index === 0;
        return {
          geometry: iceShard(random, main ? 0.06 : 0.035 + random() * 0.03, false),
          angle: random() * Math.PI * 2,
          out: main ? 0 : 0.05 + random() * 0.07,
          lean: main ? random() * 0.1 : 0.25 + random() * 0.5,
          height: main ? 1 : 0.35 + random() * 0.5,
          turn: random() * Math.PI,
        };
      }),
    }));
  }, []);
  useEffect(
    () => () => clusters.forEach(({ shards }) => shards.forEach(({ geometry }) => geometry.dispose())),
    [clusters],
  );
  const floaters = useRef<(Group | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = Math.sin(t * 0.9);
    materials.cyan.setValues({ emissiveIntensity: 0.55 + 0.2 * pulse });
    materials.lilac.setValues({ emissiveIntensity: 0.55 - 0.2 * pulse });
    materials.cyanGlow.setValues({ opacity: 0.26 + 0.1 * pulse });
    materials.lilacGlow.setValues({ opacity: 0.26 - 0.1 * pulse });
    floaters.current.forEach((floater, index) => {
      if (!floater) return;
      floater.position.y = FLOATERS[index].y + 0.05 * Math.sin(t * 0.8 + index * 2.1);
      floater.rotation.y = t * (0.6 + index * 0.2);
    });
  });

  return (
    <group>
      <mesh material={materials.ground} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {clusters.map(({ x, z, height, shards, violet }) => (
        <group key={`${x}:${z}`} position={[x, -0.01, z]}>
          <group scale={height}>
            {shards.map(({ geometry, angle, out, lean, height: shard, turn }, index) => (
              <group
                key={index}
                position={[Math.cos(angle) * out, 0, Math.sin(angle) * out]}
                rotation={[Math.sin(angle) * lean, 0, -Math.cos(angle) * lean]}
              >
                <mesh
                  geometry={geometry}
                  material={violet ? materials.lilac : materials.cyan}
                  rotation-y={turn}
                  scale={[1, shard, 1]}
                />
              </group>
            ))}
          </group>
          <sprite
            material={violet ? materials.lilacGlow : materials.cyanGlow}
            position-y={height * 0.4}
            scale={[height * 0.9, height * 1.2, 1]}
          />
          <mesh material={materials.snow} position-y={-0.015} scale={[0.17, 0.05, 0.14]}>
            <sphereGeometry args={[1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        </group>
      ))}
      {FLOATERS.map(({ x, y, z, size }, index) => (
        <group
          key={index}
          ref={(group) => {
            floaters.current[index] = group;
          }}
          position={[x, y, z]}
        >
          <mesh geometry={mote} material={materials.mote} scale={[size * 0.6, size * 1.4, size * 0.6]} />
          <sprite material={materials.cyanGlow} scale={size * 7} />
        </group>
      ))}
      <Flowers />
      <FrostTufts />
      <Sparkles />
    </group>
  );
}

/** Glowing flowers in three draws: stems, petal heads, and a glow over each that breathes in turn. */
function Flowers() {
  const petals = useCanvasTexture({ size: 128, draw: paintPetals, linear: true });
  const disc = useSoftDisc();
  const parts = useMemo(() => {
    const random = seededRandom(89);
    const ring = Array.from({ length: RING_FLOWERS }, (_, index) => {
      const angle = (index / RING_FLOWERS) * Math.PI * 2 + (random() - 0.5) * 0.25;
      const radius = RING_RADIUS + (random() - 0.5) * 0.08;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius] as [number, number];
    });
    const strays = CLUSTERS.flatMap(({ x, z }) =>
      Array.from({ length: STRAYS_PER_CLUSTER }, () => [x + (random() - 0.5) * 0.3, z + 0.08 + random() * 0.14]),
    ) as [number, number][];
    const flowers = [...ring, ...strays].map(([x, z]) => ({
      x,
      z,
      height: 0.035 + random() * 0.05,
      size: 0.035 + random() * 0.025,
      tint: FLOWER_TINTS[Math.floor(random() * FLOWER_TINTS.length)],
      tilt: (random() - 0.5) * 0.5,
      turn: random() * Math.PI * 2,
      phase: random() * Math.PI * 2,
    }));
    const count = flowers.length;
    const stemGeometry = new CylinderGeometry(0.003, 0.004, 1, 5);
    stemGeometry.translate(0, 0.5, 0);
    const stems = new InstancedMesh(stemGeometry, new MeshStandardMaterial({ color: "#4fa39a" }), count);
    const heads = new InstancedMesh(
      new PlaneGeometry(1, 1),
      new MeshBasicMaterial({ map: petals, transparent: true, depthWrite: false, side: DoubleSide, toneMapped: false }),
      count,
    );
    const dummy = new Object3D();
    flowers.forEach(({ x, z, height, size, tint, tilt, turn }, index) => {
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, 0, tilt * 0.5);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      stems.setMatrixAt(index, dummy.matrix);
      dummy.position.set(x - Math.sin(tilt * 0.5) * height, height, z);
      dummy.rotation.set(-Math.PI / 2 + tilt, 0, turn);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      heads.setMatrixAt(index, dummy.matrix);
      heads.setColorAt(index, tint);
    });
    const glow = new BufferGeometry();
    glow.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(flowers.flatMap(({ x, z, height }) => [x, height + 0.005, z])), 3),
    );
    glow.setAttribute("color", new BufferAttribute(new Float32Array(count * 3), 3));
    return { flowers, stems, heads, glow };
  }, [petals]);
  useEffect(
    () => () => {
      for (const mesh of [parts.stems, parts.heads]) {
        mesh.geometry.dispose();
        (mesh.material as MeshBasicMaterial).dispose();
        mesh.dispose();
      }
      parts.glow.dispose();
    },
    [parts],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const colors = parts.glow.getAttribute("color") as BufferAttribute;
    parts.flowers.forEach(({ tint, phase }, index) => {
      const breath = 0.45 + 0.4 * Math.sin(t * 1.4 + phase);
      colors.setXYZ(index, tint.r * breath, tint.g * breath, tint.b * breath);
    });
    colors.needsUpdate = true;
  });

  return (
    <>
      <primitive object={parts.stems} />
      <primitive object={parts.heads} />
      <points geometry={parts.glow}>
        <pointsMaterial
          map={disc}
          vertexColors
          size={0.13}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </>
  );
}

/** Teal grass poking through the snow, frosted white at the tips. */
function FrostTufts() {
  const { variants, tufts } = useMemo(() => {
    const random = seededRandom(97);
    const root = new Color("#2c6b66");
    const tip = new Color("#e6fbff");
    const variants = [0, 1].map(() => grassTuft(random, 7, 0.1, root, tip));
    const tufts = scatterAround(random, TUFTS, 0.3, 0.9).map(([x, z], index) => ({
      x,
      z,
      variant: index % variants.length,
      size: 0.7 + random() * 0.6,
      turn: random() * Math.PI * 2,
    }));
    return { variants, tufts };
  }, []);
  useEffect(() => () => variants.forEach((variant) => variant.dispose()), [variants]);

  return (
    <>
      {tufts.map(({ x, z, variant, size, turn }, index) => (
        <mesh key={index} geometry={variants[variant]} position={[x, 0, z]} rotation-y={turn} scale={size}>
          <meshStandardMaterial vertexColors side={DoubleSide} roughness={0.8} />
        </mesh>
      ))}
    </>
  );
}

/** Four-pointed glints rising slowly round her in a lazy spiral, twinkling (additive, so dark ones vanish). */
function Sparkles() {
  const star = useCanvasTexture({ size: 64, draw: paintStar, linear: true });
  const { geometry, sparks } = useMemo(() => {
    const random = seededRandom(101);
    const sparks = Array.from({ length: SPARKLES }, () => ({
      angle: random() * Math.PI * 2,
      radius: 0.3 + random() * 0.5,
      height: random() * SPARKLE_HEIGHT,
      speed: 0.06 + random() * 0.1,
      spin: (0.1 + random() * 0.2) * (random() < 0.5 ? 1 : -1),
      phase: random() * Math.PI * 2,
      tint: random() < 0.3 ? LILAC : CYAN,
    }));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(SPARKLES * 3), 3));
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(SPARKLES * 3), 3));
    return { geometry, sparks };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const colors = geometry.getAttribute("color") as BufferAttribute;
    sparks.forEach((spark, index) => {
      spark.height += spark.speed * delta;
      if (spark.height > SPARKLE_HEIGHT) spark.height -= SPARKLE_HEIGHT;
      const at = spark.angle + t * spark.spin;
      // Kept inside the stage's sides, where the canvas would spill over the page.
      const x = Math.max(-0.8, Math.min(0.8, Math.cos(at) * spark.radius));
      positions.setXYZ(index, x, spark.height, Math.sin(at) * spark.radius);
      const fade = Math.min(1, spark.height * 3, (SPARKLE_HEIGHT - spark.height) * 2);
      const glint = fade * (0.25 + 0.75 * Math.max(0, Math.sin(t * 2.3 + spark.phase)) ** 4) * 1.6;
      // Whitened at the heart so the tint reads as a glint, not a coloured dot.
      colors.setXYZ(index, (0.6 + spark.tint.r) * glint, (0.6 + spark.tint.g) * glint, (0.6 + spark.tint.b) * glint);
    });
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        map={star}
        vertexColors
        size={0.07}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/** Soft snow over moss: pale blue-white with teal moss and lilac shadows showing through, and frost glints. */
const paintFrostMoss: Painter = (context, size, random) => {
  context.fillStyle = "#cfe7ef";
  context.fillRect(0, 0, size, size);
  const blot = (x: number, y: number, radius: number, colour: string) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  for (let index = 0; index < 120; index++) {
    blot(random() * size, random() * size, 10 + random() * 30, "rgba(62,150,140,0.4)");
  }
  for (let index = 0; index < 60; index++) {
    blot(random() * size, random() * size, 16 + random() * 34, "rgba(150,130,220,0.22)");
  }
  for (let index = 0; index < 160; index++) {
    blot(random() * size, random() * size, 12 + random() * 26, "rgba(246,252,255,0.7)");
  }
  for (let index = 0; index < 1400; index++) {
    context.fillStyle = random() < 0.7 ? "rgba(255,255,255,0.9)" : "rgba(160,240,255,0.8)";
    context.fillRect(random() * size, random() * size, 1 + random(), 1 + random());
  }
};

/** Five rounded petals, white at the heart and shading off at the tips (tinted per flower). */
const paintPetals: Painter = (context, size) => {
  const centre = size / 2;
  for (let petal = 0; petal < 5; petal++) {
    context.save();
    context.translate(centre, centre);
    context.rotate((petal / 5) * Math.PI * 2);
    const gradient = context.createLinearGradient(0, 0, 0, -centre);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0.35)");
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(0, -centre * 0.48, centre * 0.27, centre * 0.46, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.fillStyle = "rgba(255,250,210,1)";
  context.beginPath();
  context.arc(centre, centre, size * 0.08, 0, Math.PI * 2);
  context.fill();
};

/** A soft glint with four long rays, white on transparent. */
const paintStar: Painter = (context, size) => {
  const centre = size / 2;
  const core = context.createRadialGradient(centre, centre, 0, centre, centre, centre * 0.45);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = core;
  context.fillRect(0, 0, size, size);
  context.fillStyle = "rgba(255,255,255,0.85)";
  for (const turn of [0, Math.PI / 2]) {
    context.save();
    context.translate(centre, centre);
    context.rotate(turn);
    context.beginPath();
    context.moveTo(-centre, 0);
    context.quadraticCurveTo(0, -2, centre, 0);
    context.quadraticCurveTo(0, 2, -centre, 0);
    context.fill();
    context.restore();
  }
};

/** A trail of packed snow through the moss, ice shards and glints of fairy light. */
const GROVE_GROUND: GroundDressing = {
  wash: { colour: "#67e8f9", alpha: 0.3 },
  path: {
    kind: "dirt",
    colour: "rgba(240,250,255,0.9)",
    edge: "rgba(150,210,235,0.5)",
    width: [0.14, 0.24],
    wind: 0.05,
  },
  litter: [{ shape: "shard", colours: ["rgba(160,240,255,0.9)", "rgba(200,180,255,0.8)"], count: 90, size: 4 }],
  glow: { colour: "#9be7ff", count: 6 },
};
const paintGroveFloor = withDressing(paintFrostMoss, GROVE_GROUND);
