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
  ExtrudeGeometry,
  MeshStandardMaterial,
  Shape,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
  type Sprite,
} from "three";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom } from "@/game/domain/random";
import { useCanvasTexture } from "./canvasTexture";

const FLOOR_RADIUS = 1;
const FLAME = new Color("#ff6a3a").multiplyScalar(2);
const EMBER = new Color("#ff7a3c").multiplyScalar(1.8);
const TORII = { z: -0.86, half: 0.5, height: 1.42, pillar: 0.045 };
const LANTERNS = [
  { x: -0.72, z: -0.4 },
  { x: 0.72, z: -0.4 },
];
/** Patches of her black fire still burning; `tongues` is how many flames each has. */
const BLACK_FIRES = [
  { x: -0.5, z: -0.8, tongues: 5, size: 0.16 },
  { x: 0.34, z: -0.56, tongues: 4, size: 0.11 },
  { x: -0.82, z: 0.16, tongues: 3, size: 0.08 },
];
/** Charred paper talismans fallen on the stones. */
const TALISMANS = [
  { x: -0.38, z: 0.46, turn: 0.6 },
  { x: 0.5, z: 0.32, turn: -0.4 },
  { x: 0.12, z: -0.66, turn: 1.4 },
];
const EMBERS = 70;
const EMBER_HEIGHT = 1.9;

/**
 * Kage Rubra's stage instead of the rune pedestal: a scorched shrine courtyard, a torii behind her, stone lanterns
 * with red flames, patches of black fire and embers rising. Origin on the floor; every flame is a sprite.
 */
export function BurningShrine() {
  const tiles = useCanvasTexture({ size: 512, draw: paintScorchedTiles, fadeFrom: 0.5 });
  const flame = useCanvasTexture({ size: 128, draw: paintFlame });
  const talisman = useCanvasTexture({ size: 128, draw: paintTalisman });
  const disc = useSoftDisc();
  const materials = useMemo(() => {
    const glow = { transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false };
    return {
      floor: new MeshStandardMaterial({ map: tiles, transparent: true, roughness: 0.9, depthWrite: false }),
      lacquer: new MeshStandardMaterial({
        color: "#7c1810",
        roughness: 0.6,
        emissive: "#2a0602",
        emissiveIntensity: 0.5,
      }),
      char: new MeshStandardMaterial({ color: "#120c0a", roughness: 0.85 }),
      lantern: new MeshStandardMaterial({ color: "#4d4843", roughness: 0.95, flatShading: true }),
      rope: new MeshStandardMaterial({ color: "#8a7650", roughness: 1 }),
      paper: new MeshStandardMaterial({ map: talisman, roughness: 0.9, side: DoubleSide, transparent: true }),
      shide: new MeshStandardMaterial({ color: "#e9e2d0", roughness: 0.9, side: DoubleSide }),
      flame: new SpriteMaterial({ map: flame, color: FLAME, ...glow }),
      halo: new SpriteMaterial({ map: disc, color: "#ff3b1f", opacity: 0.2, ...glow }),
      blackFire: new SpriteMaterial({ map: flame, color: "#030102", transparent: true, depthWrite: false }),
      blackRim: new SpriteMaterial({ map: flame, color: "#ff2a12", opacity: 0.55, ...glow }),
    };
  }, [tiles, flame, talisman, disc]);
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  const geometries = useMemo(() => {
    // The rope sags between the pillars, just under the lower beam.
    const rope = new CatmullRomCurve3([
      new Vector3(-TORII.half, 0, 0),
      new Vector3(0, -0.07, 0),
      new Vector3(TORII.half, 0, 0),
    ]);
    return { kasagi: kasagiGeometry(), rope: new TubeGeometry(rope, 24, 0.014, 6) };
  }, []);
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries]);
  const flames = useRef<(Sprite | null)[]>([]);
  const tongues = useRef<(Sprite | null)[]>([]);
  const fires = useMemo(() => {
    const random = seededRandom(83);
    return BLACK_FIRES.flatMap(({ x, z, tongues, size }) =>
      Array.from({ length: tongues }, () => ({
        x: x + (random() - 0.5) * size,
        z: z + (random() - 0.5) * size * 0.6,
        size: size * (0.6 + random() * 0.6),
        phase: random() * Math.PI * 2,
      })),
    );
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    flames.current.forEach((sprite, index) => {
      if (!sprite) return;
      const flicker = 1 + 0.14 * Math.sin(t * 12 + index * 2.1) + 0.08 * Math.sin(t * 27 + index);
      sprite.scale.set(0.05 * flicker, 0.09 * (2 - flicker), 1);
    });
    // Black fire licks slower and taller than a lantern's: it burns what it touches until nothing is left.
    fires.forEach(({ size, phase }, index) => {
      const lick = 1 + 0.2 * Math.sin(t * 6 + phase) + 0.1 * Math.sin(t * 15 + phase * 2);
      for (const layer of [0, 1]) {
        const sprite = tongues.current[index * 2 + layer];
        if (!sprite) continue;
        const grow = layer ? 1.25 : 1;
        sprite.scale.set(size * 0.55 * grow * (2 - lick), size * 1.5 * grow * lick, 1);
        sprite.position.y = size * 0.7 * lick;
      }
    });
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[FLOOR_RADIUS, 64]} />
      </mesh>
      <group position-z={TORII.z}>
        {[-1, 1].map((side) => (
          <group key={side} position-x={side * TORII.half} rotation-z={side * 0.025}>
            <mesh material={materials.lacquer} position-y={TORII.height / 2}>
              <cylinderGeometry args={[TORII.pillar * 0.9, TORII.pillar, TORII.height, 16]} />
            </mesh>
            <mesh material={materials.char} position-y={0.05}>
              <cylinderGeometry args={[TORII.pillar * 1.3, TORII.pillar * 1.35, 0.1, 16]} />
            </mesh>
          </group>
        ))}
        {/* The nuki runs through both pillars and out past them. */}
        <mesh material={materials.lacquer} position-y={TORII.height * 0.76}>
          <boxGeometry args={[TORII.half * 2.5, 0.05, 0.05]} />
        </mesh>
        <mesh material={materials.lacquer} position-y={TORII.height * 0.88}>
          <boxGeometry args={[0.07, TORII.height * 0.12, 0.04]} />
        </mesh>
        <mesh material={materials.lacquer} position-y={TORII.height * 0.97}>
          <boxGeometry args={[TORII.half * 2.6, 0.055, 0.075]} />
        </mesh>
        <mesh geometry={geometries.kasagi} material={materials.char} position-y={TORII.height * 0.97 + 0.028} />
        <group position={[0, TORII.height * 0.72, 0.04]}>
          <mesh geometry={geometries.rope} material={materials.rope} />
          {[-0.25, 0, 0.25].map((x) => (
            <mesh key={x} material={materials.shide} position={[x, -0.1 + Math.abs(x) * 0.12, 0.01]}>
              <planeGeometry args={[0.035, 0.11]} />
            </mesh>
          ))}
        </group>
      </group>
      {LANTERNS.map(({ x, z }, index) => (
        <group key={x} position={[x, 0, z]} rotation-y={x > 0 ? -0.5 : 0.5}>
          <mesh material={materials.lantern} position-y={0.025}>
            <cylinderGeometry args={[0.075, 0.085, 0.05, 6]} />
          </mesh>
          <mesh material={materials.lantern} position-y={0.15}>
            <cylinderGeometry args={[0.028, 0.034, 0.2, 8]} />
          </mesh>
          <mesh material={materials.lantern} position-y={0.265}>
            <cylinderGeometry args={[0.07, 0.05, 0.03, 6]} />
          </mesh>
          {/* The firebox is open: four corner posts with the flame between them. */}
          {[0, 1, 2, 3].map((corner) => (
            <mesh
              key={corner}
              material={materials.lantern}
              position={[
                Math.cos((corner + 0.5) * (Math.PI / 2)) * 0.04,
                0.315,
                Math.sin((corner + 0.5) * (Math.PI / 2)) * 0.04,
              ]}
            >
              <boxGeometry args={[0.014, 0.07, 0.014]} />
            </mesh>
          ))}
          <sprite
            ref={(sprite) => {
              flames.current[index] = sprite;
            }}
            material={materials.flame}
            position-y={0.32}
          />
          <sprite material={materials.halo} position-y={0.32} scale={0.5} />
          <mesh material={materials.lantern} position-y={0.375} rotation-y={Math.PI / 6}>
            <coneGeometry args={[0.1, 0.07, 6]} />
          </mesh>
          <mesh material={materials.lantern} position-y={0.425}>
            <sphereGeometry args={[0.016, 8, 6]} />
          </mesh>
        </group>
      ))}
      {fires.map(({ x, z }, index) => (
        <group key={index} position={[x, 0, z]}>
          <sprite
            ref={(sprite) => {
              tongues.current[index * 2 + 1] = sprite;
            }}
            material={materials.blackRim}
          />
          <sprite
            ref={(sprite) => {
              tongues.current[index * 2] = sprite;
            }}
            material={materials.blackFire}
            renderOrder={1}
          />
        </group>
      ))}
      {TALISMANS.map(({ x, z, turn }) => (
        <mesh key={`${x}:${z}`} material={materials.paper} position={[x, 0.004, z]} rotation={[-Math.PI / 2, 0, turn]}>
          <planeGeometry args={[0.06, 0.16]} />
        </mesh>
      ))}
      <Embers />
    </group>
  );
}

function Embers() {
  const disc = useSoftDisc();
  const { geometry, embers } = useMemo(() => {
    const random = seededRandom(89);
    const embers = Array.from({ length: EMBERS }, () => ({
      x: (random() - 0.5) * 1.7,
      z: -0.9 + random() * 1.2,
      height: random() * EMBER_HEIGHT,
      speed: 0.18 + random() * 0.3,
      phase: random() * Math.PI * 2,
    }));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(EMBERS * 3), 3));
    return { geometry, embers };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }, delta) => {
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const t = clock.elapsedTime;
    embers.forEach((ember, index) => {
      ember.height += ember.speed * delta;
      if (ember.height > EMBER_HEIGHT) ember.height -= EMBER_HEIGHT;
      // They swirl wider the higher they climb, like sparks off a fire.
      const swirl = 0.03 + ember.height * 0.05;
      positions.setXYZ(
        index,
        ember.x + Math.sin(t * 1.4 + ember.phase) * swirl,
        ember.height,
        ember.z + Math.cos(t * 1.1 + ember.phase) * swirl,
      );
    });
    positions.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        map={disc}
        color={EMBER}
        size={0.03}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/** The kasagi, the torii's top beam: thick in the middle, sweeping up at both ends. Faces +Z, 0.09 deep. */
function kasagiGeometry() {
  const half = TORII.half * 1.5;
  const shape = new Shape();
  shape.moveTo(-half, 0.07);
  shape.quadraticCurveTo(-half * 0.55, -0.005, 0, 0);
  shape.quadraticCurveTo(half * 0.55, -0.005, half, 0.07);
  shape.lineTo(half + 0.02, 0.11);
  shape.quadraticCurveTo(half * 0.55, 0.045, 0, 0.05);
  shape.quadraticCurveTo(-half * 0.55, 0.045, -half - 0.02, 0.11);
  shape.lineTo(-half, 0.07);
  const geometry = new ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: false, curveSegments: 12 });
  geometry.translate(0, 0, -0.045);
  return geometry;
}

/** Square stone tiles under ash, scorched black where the fire passed, a few cracks still glowing. */
function paintScorchedTiles(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(79);
  context.fillStyle = "#0e0b0a";
  context.fillRect(0, 0, size, size);
  const cell = 56;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const shade = 44 + random() * 20;
      context.fillStyle = `rgb(${shade + 6},${shade},${shade - 4})`;
      context.fillRect(x + 3, y + 3, cell - 6, cell - 6);
    }
  }
  for (let fleck = 0; fleck < 2600; fleck++) {
    context.fillStyle = random() < 0.6 ? "rgba(10,8,8,0.4)" : "rgba(120,110,100,0.18)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  for (let scorch = 0; scorch < 9; scorch++) {
    const x = random() * size;
    const y = random() * size;
    const radius = 30 + random() * 70;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(4,2,2,0.85)");
    gradient.addColorStop(1, "rgba(4,2,2,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  context.lineCap = "round";
  for (let crack = 0; crack < 10; crack++) {
    let [x, y] = [random() * size, random() * size];
    context.strokeStyle = `rgba(255,${70 + random() * 50},30,${0.35 + random() * 0.3})`;
    context.lineWidth = 1 + random() * 1.5;
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 6; step++) {
      x += (random() - 0.5) * 30;
      y += (random() - 0.5) * 30;
      context.lineTo(x, y);
    }
    context.stroke();
  }
}

/** A flame's teardrop, white and soft-edged, its base at the bottom of the square. */
function paintFlame(context: CanvasRenderingContext2D, size: number) {
  const gradient = context.createRadialGradient(size / 2, size * 0.68, 0, size / 2, size * 0.6, size * 0.42);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.65)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(size / 2, size * 0.04);
  context.bezierCurveTo(size * 0.62, size * 0.35, size * 0.86, size * 0.55, size * 0.8, size * 0.78);
  context.bezierCurveTo(size * 0.74, size * 0.98, size * 0.26, size * 0.98, size * 0.2, size * 0.78);
  context.bezierCurveTo(size * 0.14, size * 0.55, size * 0.38, size * 0.35, size / 2, size * 0.04);
  context.fill();
}

/** An ofuda strip: paper with a red seal and black strokes, its lower end burnt away. */
function paintTalisman(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(97);
  context.fillStyle = "#d8ccae";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#a3201a";
  context.fillRect(size * 0.3, size * 0.06, size * 0.4, size * 0.12);
  context.strokeStyle = "#1a1210";
  context.lineWidth = size * 0.05;
  for (let stroke = 0; stroke < 7; stroke++) {
    const y = size * (0.25 + stroke * 0.08);
    context.beginPath();
    context.moveTo(size * (0.3 + random() * 0.15), y);
    context.lineTo(size * (0.55 + random() * 0.15), y + (random() - 0.5) * size * 0.06);
    context.stroke();
  }
  // A ragged charred edge, then nothing below it.
  context.globalCompositeOperation = "source-atop";
  const burn = context.createLinearGradient(0, size * 0.72, 0, size * 0.85);
  burn.addColorStop(0, "rgba(20,10,6,0)");
  burn.addColorStop(1, "rgba(20,10,6,1)");
  context.fillStyle = burn;
  context.fillRect(0, 0, size, size);
  context.globalCompositeOperation = "destination-out";
  context.beginPath();
  context.moveTo(0, size);
  for (let x = 0; x <= size; x += size / 10) context.lineTo(x, size * (0.82 + random() * 0.08));
  context.lineTo(size, size);
  context.fill();
}
