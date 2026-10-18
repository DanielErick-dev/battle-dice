"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DodecahedronGeometry,
  DoubleSide,
  LatheGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SpriteMaterial,
  Vector2,
  type Mesh,
  type Sprite,
  type Texture,
} from "three";
import { useSoftDisc } from "@/features/match/scene/character/softDisc";
import { seededRandom } from "@/game/domain/random";
import { useNoiseTexture, type NoiseLook } from "./noiseTexture";
import { ABOVE_FLOOR, taperedTube, usePaintedTexture, type Painter } from "./sceneryKit";

const GROUND_RADIUS = 1;
/** Thick end first: they come out of the earth past the rim, arch and dive back in (cut at the floor). */
const ROOTS: { points: [number, number, number][]; radius: number }[] = [
  {
    points: [
      [-1.1, -0.05, -0.5],
      [-0.86, 0.13, -0.46],
      [-0.7, 0.07, -0.3],
      [-0.6, 0.01, -0.12],
    ],
    radius: 0.065,
  },
  {
    points: [
      [-0.95, -0.06, -0.95],
      [-0.66, 0.15, -0.8],
      [-0.44, 0.08, -0.72],
      [-0.26, 0.0, -0.62],
    ],
    radius: 0.06,
  },
  {
    points: [
      [-0.6, -0.06, -1.15],
      [-0.4, 0.1, -0.98],
      [-0.12, 0.05, -0.92],
      [0.08, 0.0, -0.95],
    ],
    radius: 0.045,
  },
  {
    points: [
      [1.12, -0.05, -0.36],
      [0.9, 0.11, -0.3],
      [0.78, 0.05, -0.12],
      [0.74, 0.0, 0.06],
    ],
    radius: 0.05,
  },
  {
    points: [
      [1.0, -0.05, -1.0],
      [0.86, 0.09, -0.98],
      [0.7, 0.0, -1.02],
    ],
    radius: 0.035,
  },
];
const MUSHROOMS = [
  { x: -0.62, z: -0.05, cap: 0.045, height: 0.08, lean: 0.15 },
  { x: -0.55, z: -0.02, cap: 0.028, height: 0.05, lean: -0.2 },
  { x: -0.66, z: 0.04, cap: 0.02, height: 0.035, lean: 0.3 },
  { x: -0.22, z: -0.56, cap: 0.038, height: 0.07, lean: -0.1 },
  { x: -0.15, z: -0.6, cap: 0.024, height: 0.045, lean: 0.25 },
  { x: 0.72, z: 0.12, cap: 0.034, height: 0.06, lean: -0.15 },
  { x: 0.8, z: 0.08, cap: 0.022, height: 0.04, lean: 0.2 },
  { x: -0.85, z: 0.35, cap: 0.03, height: 0.05, lean: 0.1 },
];
/** A faint glow over each clump of mushrooms. */
const SPORE_GLOWS = [
  { x: -0.6, z: -0.01, size: 0.32 },
  { x: -0.19, z: -0.58, size: 0.26 },
  { x: 0.76, z: 0.1, size: 0.24 },
  { x: -0.85, z: 0.35, size: 0.18 },
];
const STONES = 15;
const STONE_RING = 0.6;
const CAULDRON = { x: 0.46, z: -0.76 };
/** The pot's outline, bottom up, before it's turned; it stands on legs this high. */
const POT_PROFILE = [
  [0, 0],
  [0.08, 0.005],
  [0.14, 0.035],
  [0.172, 0.09],
  [0.18, 0.14],
  [0.168, 0.19],
  [0.148, 0.22],
  [0.152, 0.232],
] as const;
const POT_LIFT = 0.07;
const BREW_Y = POT_LIFT + 0.21;
const BUBBLES = 5;
const STEAM = 8;
const STEAM_RISE = 0.75;
const BREW = new Color("#ff2436").multiplyScalar(1.6);
const FLAME = new Color("#ff9a3a").multiplyScalar(2.2);

/** The Crimson Witch's stage: a forest clearing, roots, glowing toadstools, a ring of stones and a blood-red brew. */
export function WitchHollow() {
  const soil = usePaintedTexture(paintForestFloor, 31, 512, 0.3);
  const bark = useNoiseTexture(BARK);
  const stone = useNoiseTexture(STONE);
  const caps = usePaintedTexture(paintToadstoolCap, 5, 128);
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: soil, transparent: true, roughness: 1, depthWrite: false }),
      root: new MeshStandardMaterial({ map: bark, color: "#6b5444", roughness: 1, clippingPlanes: ABOVE_FLOOR }),
      stone: new MeshStandardMaterial({ map: stone, roughness: 0.95, flatShading: true }),
      stem: new MeshStandardMaterial({ color: "#d8cdb8", roughness: 0.8 }),
      cap: new MeshStandardMaterial({
        map: caps,
        roughness: 0.55,
        emissive: "#ff1f2e",
        emissiveMap: caps,
        emissiveIntensity: 0.35,
      }),
      iron: new MeshStandardMaterial({ color: "#1c1b1f", metalness: 0.7, roughness: 0.55, side: DoubleSide }),
      wood: new MeshStandardMaterial({ color: "#2b1d14", roughness: 1 }),
      brew: new MeshBasicMaterial({ color: BREW, toneMapped: false }),
      bubble: new MeshBasicMaterial({ color: new Color("#ff5a64").multiplyScalar(1.8), toneMapped: false }),
      glow: new MeshBasicMaterial({
        map: disc,
        color: "#ff1a2a",
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
      flame: glowSprite(disc, FLAME, 1),
      fireHalo: glowSprite(disc, new Color("#ff7a2a"), 0.18),
      brewHalo: glowSprite(disc, new Color("#ff2030"), 0.22),
      spore: glowSprite(disc, new Color("#ff3040"), 0.14),
      steam: Array.from({ length: STEAM }, () => glowSprite(disc, new Color("#ff3344"), 0)),
    }),
    [soil, bark, stone, caps, disc],
  );
  useEffect(
    () => () =>
      Object.values(materials)
        .flat()
        .forEach((material) => material.dispose()),
    [materials],
  );
  const geometries = useMemo(
    () => ({
      roots: ROOTS.map(({ points, radius }) => taperedTube(points, radius, 0.85)),
      pot: new LatheGeometry(
        POT_PROFILE.map(([x, y]) => new Vector2(x, y)),
        28,
      ),
      stone: new DodecahedronGeometry(1, 0),
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
  const stones = useMemo(() => {
    const random = seededRandom(41);
    return Array.from({ length: STONES }, (_, index) => {
      const angle = (index / STONES) * Math.PI * 2 + (random() - 0.5) * 0.25;
      const radius = STONE_RING + (random() - 0.5) * 0.06;
      const size = 0.028 + random() * 0.026;
      return {
        position: [Math.cos(angle) * radius, size * 0.3, Math.sin(angle) * radius] as const,
        scale: [size * (1 + random() * 0.4), size * 0.7, size] as const,
        turn: random() * Math.PI,
      };
    });
  }, []);
  const sigil = useRef<Mesh>(null);
  const spores = useRef<(Sprite | null)[]>([]);
  const flames = useRef<(Sprite | null)[]>([]);
  const bubbles = useRef<(Mesh | null)[]>([]);
  const steam = useRef<(Sprite | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (sigil.current) {
      (sigil.current.material as MeshBasicMaterial).opacity =
        0.14 + 0.07 * Math.sin(t * 1.4) + 0.03 * Math.sin(t * 3.7);
    }
    spores.current.forEach((spore, index) =>
      spore?.scale.setScalar(SPORE_GLOWS[index].size * (1 + 0.18 * Math.sin(t * 0.9 + index * 1.3))),
    );
    flames.current.forEach((flame, index) => {
      if (!flame) return;
      const flicker = 1 + 0.15 * Math.sin(t * 12 + index * 2.3) + 0.08 * Math.sin(t * 27 + index);
      flame.scale.set(0.05 * flicker, 0.09 * (2 - flicker), 1);
    });
    bubbles.current.forEach((bubble, index) => {
      if (!bubble) return;
      // Each swells on the surface, then pops and starts over.
      const life = (t * 0.7 + index / BUBBLES) % 1;
      bubble.scale.setScalar(life < 0.85 ? (life / 0.85) * 0.022 : 0);
    });
    steam.current.forEach((puff, index) => {
      if (!puff) return;
      const life = (t * 0.28 + index / STEAM) % 1;
      puff.position.set(Math.sin(life * 3 + index * 1.7) * 0.07 * life, BREW_Y + life * STEAM_RISE, 0);
      puff.scale.setScalar(0.1 + life * 0.38);
      puff.material.opacity = 0.2 * Math.sin(life * Math.PI);
    });
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      <mesh ref={sigil} material={materials.glow} rotation-x={-Math.PI / 2} position-y={0.004} renderOrder={1}>
        <planeGeometry args={[1.25, 1.25]} />
      </mesh>
      {geometries.roots.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={materials.root} />
      ))}
      {stones.map(({ position, scale, turn }, index) => (
        <mesh
          key={index}
          geometry={geometries.stone}
          material={materials.stone}
          position={position}
          scale={scale}
          rotation-y={turn}
        />
      ))}
      {MUSHROOMS.map(({ x, z, cap, height, lean }) => (
        <group key={`${x}:${z}`} position={[x, 0, z]} rotation-z={lean}>
          <mesh material={materials.stem} position-y={height / 2}>
            <cylinderGeometry args={[cap * 0.22, cap * 0.32, height, 8]} />
          </mesh>
          <mesh material={materials.cap} position-y={height * 0.92} scale={[cap, cap * 0.62, cap]}>
            <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        </group>
      ))}
      {SPORE_GLOWS.map(({ x, z }, index) => (
        <sprite
          key={`${x}:${z}`}
          ref={(sprite) => {
            spores.current[index] = sprite;
          }}
          material={materials.spore}
          position={[x, 0.07, z]}
        />
      ))}
      <group position={[CAULDRON.x, 0, CAULDRON.z]} rotation-y={-0.4}>
        {[0, 1, 2].map((leg) => {
          const angle = (leg / 3) * Math.PI * 2;
          return (
            <mesh
              key={leg}
              material={materials.iron}
              position={[Math.cos(angle) * 0.1, POT_LIFT / 2 + 0.01, Math.sin(angle) * 0.1]}
              rotation={[Math.sin(angle) * 0.25, 0, -Math.cos(angle) * 0.25]}
            >
              <cylinderGeometry args={[0.012, 0.008, POT_LIFT + 0.02, 6]} />
            </mesh>
          );
        })}
        <mesh geometry={geometries.pot} material={materials.iron} position-y={POT_LIFT} />
        <mesh material={materials.iron} position-y={POT_LIFT + 0.232} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.15, 0.013, 8, 32]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            material={materials.iron}
            position={[side * 0.175, POT_LIFT + 0.17, 0]}
            rotation-y={Math.PI / 2}
          >
            <torusGeometry args={[0.025, 0.006, 6, 16]} />
          </mesh>
        ))}
        <mesh material={materials.brew} position-y={BREW_Y} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.152, 28]} />
        </mesh>
        {Array.from({ length: BUBBLES }, (_, index) => {
          const angle = index * 2.4;
          const radius = 0.03 + (index % 3) * 0.035;
          return (
            <mesh
              key={index}
              ref={(mesh) => {
                bubbles.current[index] = mesh;
              }}
              material={materials.bubble}
              position={[Math.cos(angle) * radius, BREW_Y, Math.sin(angle) * radius]}
            >
              <sphereGeometry args={[1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
          );
        })}
        <sprite material={materials.brewHalo} position-y={BREW_Y + 0.05} scale={0.6} />
        {Array.from({ length: STEAM }, (_, index) => (
          <sprite
            key={index}
            ref={(sprite) => {
              steam.current[index] = sprite;
            }}
            material={materials.steam[index]}
          />
        ))}
        {/* Logs crossed under the pot, the fire licking up between its legs. */}
        {[0, 1, 2].map((log) => (
          <mesh
            key={log}
            material={materials.wood}
            position-y={0.016}
            rotation={[0, (log / 3) * Math.PI + 0.3, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.016, 0.016, 0.2, 7]} />
          </mesh>
        ))}
        {[-0.04, 0.03, 0.0].map((x, index) => (
          <sprite
            key={index}
            ref={(sprite) => {
              flames.current[index] = sprite;
            }}
            material={materials.flame}
            position={[x, 0.06, index === 2 ? 0.05 : 0]}
          />
        ))}
        <sprite material={materials.fireHalo} position-y={0.05} scale={0.55} />
      </group>
    </group>
  );
}

function glowSprite(map: Texture, color: Color, opacity: number): SpriteMaterial {
  return new SpriteMaterial({
    map,
    color,
    opacity,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
}

/** Dark loam with moss patches, fallen leaves and grit. */
const paintForestFloor: Painter = (context, size, random) => {
  context.fillStyle = "#18120e";
  context.fillRect(0, 0, size, size);
  for (let patch = 0; patch < 34; patch++) {
    const x = random() * size;
    const y = random() * size;
    const radius = 20 + random() * 55;
    const moss = context.createRadialGradient(x, y, 0, x, y, radius);
    moss.addColorStop(0, `rgba(${38 + random() * 14},${54 + random() * 18},${26 + random() * 8},0.55)`);
    moss.addColorStop(1, "rgba(30,40,20,0)");
    context.fillStyle = moss;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  for (let fleck = 0; fleck < 2600; fleck++) {
    context.fillStyle = random() < 0.6 ? "rgba(6,4,3,0.4)" : "rgba(70,56,42,0.3)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  const leaves = ["#4a2312", "#5c1a14", "#3a2a14", "#6b2a16", "#2e1f12"];
  for (let leaf = 0; leaf < 170; leaf++) {
    context.fillStyle = leaves[Math.floor(random() * leaves.length)];
    context.globalAlpha = 0.55 + random() * 0.35;
    context.beginPath();
    context.ellipse(
      random() * size,
      random() * size,
      3 + random() * 5,
      1.5 + random() * 2.5,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.globalAlpha = 1;
};

/** Red with pale warts; on a hemisphere's UVs the top of the canvas is the cap's crown. */
const paintToadstoolCap: Painter = (context, size, random) => {
  const gradient = context.createLinearGradient(0, 0, 0, size / 2);
  gradient.addColorStop(0, "#d9182a");
  gradient.addColorStop(1, "#7a0a14");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#f3e6d4";
  for (let wart = 0; wart < 22; wart++) {
    context.beginPath();
    context.arc(random() * size, random() * size * 0.42, 2 + random() * 4, 0, Math.PI * 2);
    context.fill();
  }
};

const BARK: NoiseLook = { base: [52, 38, 28], dark: [22, 15, 10], light: [86, 68, 50], fadeOut: false };
const STONE: NoiseLook = { base: [72, 70, 66], dark: [34, 33, 31], light: [108, 104, 96], fadeOut: false };
