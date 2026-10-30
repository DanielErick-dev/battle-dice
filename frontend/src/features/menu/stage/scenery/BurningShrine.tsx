"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  MeshStandardMaterial,
  SpriteMaterial,
  type Sprite,
} from "three";
import { usePropMesh } from "@/features/match/scene/character/props";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom } from "@/game/domain/random";
import { useCanvasTexture, type Painter } from "./kit/textures";

/** Wide enough to reach under the tree, behind the torii. */
const FLOOR_RADIUS = 1.45;
const EMBER = new Color("#ff7a3c").multiplyScalar(1.8);
/** The torii (a Meshy prop) towers behind her, its beams well over her head (she stands 1.7). */
const TORII = { z: -0.86, height: 2.15 };
/** Small crimson trees (a Meshy prop, 2 tall in its export) at her sides, by the torii's pillars. */
const TREES = [
  { x: 0.98, z: -0.4, height: 0.95, turn: -0.3 },
  { x: -0.98, z: -0.45, height: 0.88, turn: 2.6 },
];
/** How tall the prop is in its export (its top beam, the longest side, spans 2). */
const TORII_EXPORT_HEIGHT = 1.72;
/** Patches of her black fire still burning; `tongues` is how many flames each has. */
const BLACK_FIRES = [
  { x: -0.5, z: -0.8, tongues: 5, size: 0.16 },
  { x: 0.34, z: -0.56, tongues: 4, size: 0.11 },
  { x: -0.82, z: 0.16, tongues: 3, size: 0.08 },
];
const EMBERS = 70;
const EMBER_HEIGHT = 1.9;

/**
 * Kage Rubra's stage instead of the rune pedestal: a scorched shrine courtyard, a torii and a crimson tree behind her, patches
 * of black fire and embers rising. Origin on the floor; every flame is a sprite.
 */
export function BurningShrine() {
  const tiles = useCanvasTexture({ size: 512, draw: paintShrineGround, seed: 79, fadeFrom: 0.62 });
  const flame = useCanvasTexture({ size: 128, draw: paintFlame });
  const torii = usePropMesh("kageTorii");
  const tree = usePropMesh("kageTree");
  const materials = useMemo(() => {
    const glow = { transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false };
    return {
      floor: new MeshStandardMaterial({ map: tiles, transparent: true, roughness: 0.9, depthWrite: false }),
      blackFire: new SpriteMaterial({ map: flame, color: "#030102", transparent: true, depthWrite: false }),
      blackRim: new SpriteMaterial({ map: flame, color: "#ff2a12", opacity: 0.55, ...glow }),
    };
  }, [tiles, flame]);
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
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
    // Black fire licks slow and tall: it burns what it touches until nothing is left.
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
      <mesh
        geometry={torii.geometry}
        material={torii.material}
        scale={TORII.height / TORII_EXPORT_HEIGHT}
        position={[0, TORII.height / 2, TORII.z]}
      />
      {TREES.map(({ x, z, height, turn }) => (
        <mesh
          key={x}
          geometry={tree.geometry}
          material={tree.material}
          scale={height / 2}
          position={[x, height / 2, z]}
          rotation-y={turn}
        />
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

/**
 * The shrine's ground: a path of dark red flagstones running back to the torii (the canvas's top is the back) through
 * ash and charred earth, crimson petals blown off the tree (thickest on its side), scorch marks and glowing cracks.
 */
const paintShrineGround: Painter = (context, size, random) => {
  context.fillStyle = "#1c0f0c";
  context.fillRect(0, 0, size, size);
  const blot = (x: number, y: number, radius: number, colour: string) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  // Ash drifts and charred patches.
  for (let index = 0; index < 120; index++) {
    const ash = random() < 0.5;
    blot(random() * size, random() * size, 14 + random() * 36, ash ? "rgba(92,80,74,0.35)" : "rgba(40,10,8,0.6)");
  }
  // The path: rows of uneven slabs, narrowing towards the torii.
  const rows = 9;
  for (let row = 0; row < rows; row++) {
    const y = (row / rows) * size;
    const width = size * (0.16 + (row / rows) * 0.1);
    const height = size / rows;
    let x = size / 2 - width / 2;
    while (x < size / 2 + width / 2) {
      const slab = width * (0.3 + random() * 0.35);
      const shade = 0.75 + random() * 0.4;
      context.fillStyle = `rgb(${86 * shade},${44 * shade},${38 * shade})`;
      context.beginPath();
      context.roundRect(x + 2, y + 2, Math.min(slab, size / 2 + width / 2 - x) - 4, height - 4, 5);
      context.fill();
      x += slab;
    }
  }
  for (let fleck = 0; fleck < 3000; fleck++) {
    context.fillStyle = random() < 0.6 ? "rgba(8,4,4,0.45)" : "rgba(150,120,110,0.18)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  for (let scorch = 0; scorch < 8; scorch++) {
    blot(random() * size, random() * size, 30 + random() * 60, "rgba(4,1,1,0.8)");
  }
  // Petals: little crimson ellipses, piling up under the tree (back right).
  for (let petal = 0; petal < 520; petal++) {
    const underTree = random() < 0.55;
    const x = underTree ? size * (0.62 + random() * 0.38) : random() * size;
    const y = underTree ? size * random() * 0.5 : random() * size;
    context.save();
    context.translate(x, y);
    context.rotate(random() * Math.PI);
    context.fillStyle = ["rgba(196,22,40,0.85)", "rgba(150,12,30,0.85)", "rgba(230,60,70,0.8)"][petal % 3];
    context.beginPath();
    context.ellipse(0, 0, 2.6 + random() * 2, 1.4 + random(), 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  // Cracks still glowing from the fire, with a soft halo.
  context.lineCap = "round";
  for (let crack = 0; crack < 16; crack++) {
    let [x, y] = [random() * size, random() * size];
    blot(x, y, 26, "rgba(255,70,20,0.18)");
    context.strokeStyle = `rgba(255,${80 + random() * 60},30,${0.5 + random() * 0.35})`;
    context.lineWidth = 1 + random() * 1.8;
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 7; step++) {
      x += (random() - 0.5) * 32;
      y += (random() - 0.5) * 32;
      context.lineTo(x, y);
    }
    context.stroke();
  }
};

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
