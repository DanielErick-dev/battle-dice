"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  MeshStandardMaterial,
  SpriteMaterial,
  type Group,
  type Sprite,
} from "three";
import { useSoftDisc } from "@/features/match/scene/character/shared/softDisc";
import { seededRandom } from "@/game/domain/random";
import { GROUND_RADIUS, roughen } from "./sceneryKit";
import { withDressing, type GroundDressing } from "./groundDressing";
import { useCanvasTexture, useNoiseTexture, type NoiseLook } from "./textures";

const GHOST = new Color("#9be3ff").multiplyScalar(1.6);
const COLUMN_RADIUS = 0.075;
/** `broken` columns end in a jagged stump instead of their capital. */
const COLUMNS = [
  { x: -0.68, z: -0.5, height: 1.25, broken: false, lean: 0.03 },
  { x: -0.26, z: -0.88, height: 0.55, broken: true, lean: -0.05 },
  { x: 0.46, z: -0.8, height: 0.9, broken: true, lean: 0.06 },
  { x: 0.8, z: -0.36, height: 0.32, broken: true, lean: 0 },
];
/** Fallen masonry: `size` is [width, height, depth]. */
const BLOCKS = [
  { x: -0.52, z: -0.7, size: [0.2, 0.1, 0.14], turn: 0.4, tilt: 0.05 },
  { x: -0.42, z: -0.82, size: [0.12, 0.08, 0.1], turn: -0.7, tilt: 0.3 },
  { x: 0.16, z: -0.88, size: [0.22, 0.12, 0.15], turn: 0.15, tilt: 0 },
  { x: 0.66, z: -0.6, size: [0.14, 0.09, 0.12], turn: 1.1, tilt: -0.2 },
  { x: -0.8, z: 0.12, size: [0.13, 0.07, 0.1], turn: 0.6, tilt: 0.1 },
] as const;
/** A column drum that toppled and lies on its side. */
const DRUM = { x: 0.7, z: 0.02, length: 0.26, turn: 0.5 };
/** Low fog patches on the ground, and the taller banks drifting behind. */
const FOG_PATCHES = 12;
const FOG_BANKS = 5;
/** Each wisp wanders its own loop: centre, reach and height. */
const WISPS = [
  { x: -0.55, z: -0.55, reach: 0.22, height: 0.75, speed: 0.35 },
  { x: 0.45, z: -0.6, reach: 0.25, height: 0.45, speed: -0.28 },
  { x: 0.05, z: -0.85, reach: 0.3, height: 1.05, speed: 0.22 },
  { x: -0.75, z: 0.05, reach: 0.15, height: 0.3, speed: -0.4 },
];
const TRAIL = 5;
const MOON = { x: 0.62, y: 1.75, z: -1.15 };

/**
 * The Shadow Warden's stage instead of the rune pedestal: moonlit ruins, broken columns and fallen stones, fog
 * creeping low and pale wisps wandering between them. Origin on the floor; wisps and moon are sprites.
 */
export function MistRuins() {
  const paving = useCanvasTexture({ size: 512, draw: paintRuinFloor, fadeFrom: 0.5 });
  const stone = useNoiseTexture(STONE);
  const disc = useSoftDisc();
  const moon = useCanvasTexture({ size: 128, draw: paintMoon });
  const materials = useMemo(() => {
    const glow = { map: disc, transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false };
    return {
      floor: new MeshStandardMaterial({ map: paving, transparent: true, roughness: 0.95, depthWrite: false }),
      stone: new MeshStandardMaterial({ map: stone, roughness: 0.95 }),
      fluted: new MeshStandardMaterial({ map: stone, roughness: 0.9, flatShading: true }),
      moon: new SpriteMaterial({ map: moon, color: "#dbe8ff", transparent: true, depthWrite: false, fog: false }),
      moonHalo: new SpriteMaterial({ ...glow, color: "#5b7fb3", opacity: 0.35 }),
      trail: Array.from(
        { length: TRAIL },
        (_, index) => new SpriteMaterial({ ...glow, color: GHOST, opacity: 0.75 * (1 - index / TRAIL) }),
      ),
      aura: new SpriteMaterial({ ...glow, color: "#4aa8d8", opacity: 0.18 }),
    };
  }, [paving, stone, moon, disc]);
  useEffect(
    () => () =>
      Object.values(materials)
        .flat()
        .forEach((material) => material.dispose()),
    [materials],
  );
  const stumps = useMemo(() => {
    const random = seededRandom(61);
    return COLUMNS.map(() =>
      roughen(new CylinderGeometry(COLUMN_RADIUS * 0.85, COLUMN_RADIUS, 0.12, 10, 2), random, 0.06),
    );
  }, []);
  useEffect(() => () => stumps.forEach((geometry) => geometry.dispose()), [stumps]);

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      <sprite material={materials.moonHalo} position={[MOON.x, MOON.y, MOON.z]} scale={1.1} renderOrder={-2} />
      <sprite material={materials.moon} position={[MOON.x, MOON.y, MOON.z]} scale={0.3} renderOrder={-2} />
      {COLUMNS.map(({ x, z, height, broken, lean }, index) => (
        <group key={`${x}:${z}`} position={[x, 0, z]} rotation-z={lean}>
          <mesh material={materials.stone} position-y={0.03}>
            <boxGeometry args={[COLUMN_RADIUS * 3, 0.06, COLUMN_RADIUS * 3]} />
          </mesh>
          {/* Ten flat sides catch the moon like flutes. */}
          <mesh material={materials.fluted} position-y={0.06 + height / 2}>
            <cylinderGeometry args={[COLUMN_RADIUS * 0.9, COLUMN_RADIUS, height, 10]} />
          </mesh>
          {broken ? (
            <mesh geometry={stumps[index]} material={materials.fluted} position-y={0.06 + height + 0.03} />
          ) : (
            <group position-y={0.06 + height}>
              <mesh material={materials.stone} position-y={0.025}>
                <cylinderGeometry args={[COLUMN_RADIUS * 1.35, COLUMN_RADIUS * 0.9, 0.05, 12]} />
              </mesh>
              <mesh material={materials.stone} position-y={0.07}>
                <boxGeometry args={[COLUMN_RADIUS * 3, 0.04, COLUMN_RADIUS * 3]} />
              </mesh>
            </group>
          )}
        </group>
      ))}
      {BLOCKS.map(({ x, z, size, turn, tilt }) => (
        <mesh
          key={`${x}:${z}`}
          material={materials.stone}
          position={[x, size[1] / 2 - 0.01, z]}
          rotation={[tilt, turn, tilt * 0.5]}
        >
          <boxGeometry args={[...size]} />
        </mesh>
      ))}
      <mesh
        material={materials.fluted}
        position={[DRUM.x, COLUMN_RADIUS * 0.95, DRUM.z]}
        rotation={[0, DRUM.turn, Math.PI / 2]}
      >
        <cylinderGeometry args={[COLUMN_RADIUS, COLUMN_RADIUS, DRUM.length, 10]} />
      </mesh>
      <GroundFog />
      <Wisps trail={materials.trail} aura={materials.aura} />
    </group>
  );
}

function GroundFog() {
  const disc = useSoftDisc();
  const patches = useRef<(Group | null)[]>([]);
  const banks = useRef<(Sprite | null)[]>([]);
  const fog = useMemo(
    () => ({
      patches: Array.from({ length: FOG_PATCHES }, (_, index) => ({
        radius: 0.3 + ((index * 0.41) % 0.6),
        angle: index * 2.4,
        speed: 0.035 * (index % 2 ? 1 : -1),
        size: 0.6 + (index % 4) * 0.16,
        height: 0.01 + (index % 4) * 0.03,
      })),
      banks: Array.from({ length: FOG_BANKS }, (_, index) => ({
        x: -0.8 + index * 0.4,
        z: -0.75 + (index % 2) * 0.15,
        size: 0.8 + (index % 3) * 0.2,
      })),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    fog.patches.forEach(({ radius, angle, speed, height, size }, index) => {
      const patch = patches.current[index];
      if (!patch) return;
      const at = angle + t * speed;
      patch.position.set(Math.cos(at) * radius, height, Math.sin(at) * radius);
      patch.scale.setScalar(size * (1 + 0.12 * Math.sin(t * 0.45 + index)));
    });
    // The banks drift sideways and back, never leaving the back arc.
    fog.banks.forEach(({ x, z, size }, index) => {
      const bank = banks.current[index];
      if (!bank) return;
      bank.position.set(x + Math.sin(t * 0.12 + index * 1.9) * 0.12, 0.14, z);
      bank.scale.set(size * 1.4, size * 0.45, 1);
    });
  });

  return (
    <>
      {fog.patches.map((_, index) => (
        <group
          key={index}
          ref={(group) => {
            patches.current[index] = group;
          }}
        >
          <mesh rotation-x={-Math.PI / 2} renderOrder={3}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={disc} color="#a9c4e4" opacity={0.13} transparent depthWrite={false} />
          </mesh>
        </group>
      ))}
      {fog.banks.map((_, index) => (
        <sprite
          key={index}
          ref={(sprite) => {
            banks.current[index] = sprite;
          }}
          renderOrder={3}
        >
          <spriteMaterial map={disc} color="#8fa9cc" opacity={0.16} transparent depthWrite={false} />
        </sprite>
      ))}
    </>
  );
}

/** Pale lights wandering between the stones, each trailing a fading tail along the loop it follows. */
function Wisps({ trail, aura }: { trail: SpriteMaterial[]; aura: SpriteMaterial }) {
  const sprites = useRef<(Sprite | null)[]>([]);
  const auras = useRef<(Sprite | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    WISPS.forEach(({ x, z, reach, height, speed }, wisp) => {
      const place = (sprite: Sprite | null, at: number) => {
        if (!sprite) return;
        const angle = at * speed * 3 + wisp * 2;
        sprite.position.set(
          x + Math.cos(angle) * reach,
          height + Math.sin(at * 1.1 + wisp) * 0.08,
          z + Math.sin(angle * 2) * reach * 0.4,
        );
      };
      // Fades in and out on its own slow breath, so they never all show at once.
      const breath = 0.5 + 0.5 * Math.sin(t * 0.5 + wisp * 1.7);
      for (let segment = 0; segment < TRAIL; segment++) {
        const sprite = sprites.current[wisp * TRAIL + segment];
        place(sprite, t - segment * 0.09);
        sprite?.scale.setScalar((0.07 - segment * 0.01) * (0.4 + breath));
      }
      const glow = auras.current[wisp];
      place(glow, t);
      glow?.scale.setScalar(0.45 * (0.3 + breath));
    });
  });

  return (
    <>
      {WISPS.map((_, wisp) => (
        <group key={wisp}>
          <sprite
            material={aura}
            ref={(sprite) => {
              auras.current[wisp] = sprite;
            }}
          />
          {trail.map((material, segment) => (
            <sprite
              key={segment}
              material={material}
              ref={(sprite) => {
                sprites.current[wisp * TRAIL + segment] = sprite;
              }}
            />
          ))}
        </group>
      ))}
    </>
  );
}

/** Old paving in the moonlight: uneven slabs, some lost to the soil, worn and cracked. */
function paintPaving(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(67);
  context.fillStyle = "#0d1014";
  context.fillRect(0, 0, size, size);
  const cell = 64;
  for (let row = 0; row < size / cell; row++) {
    const offset = row % 2 ? cell * 0.5 : 0;
    for (let column = -1; column < size / cell; column++) {
      if (random() < 0.12) continue;
      const left = column * cell + offset;
      const top = row * cell;
      const jitter = () => (random() - 0.5) * 9;
      const shade = 52 + random() * 26;
      context.fillStyle = `rgb(${shade - 6},${shade},${shade + 10})`;
      context.beginPath();
      context.moveTo(left + 4 + jitter(), top + 4 + jitter());
      context.lineTo(left + cell - 4 + jitter(), top + 4 + jitter());
      context.lineTo(left + cell - 4 + jitter(), top + cell - 4 + jitter());
      context.lineTo(left + 4 + jitter(), top + cell - 4 + jitter());
      context.fill();
      if (random() < 0.35) {
        context.strokeStyle = "rgba(10,12,16,0.7)";
        context.lineWidth = 1.2;
        context.beginPath();
        context.moveTo(left + random() * cell, top + random() * cell);
        context.lineTo(left + random() * cell, top + random() * cell);
        context.lineTo(left + random() * cell, top + random() * cell);
        context.stroke();
      }
    }
  }
  for (let fleck = 0; fleck < 3000; fleck++) {
    context.fillStyle = random() < 0.55 ? "rgba(8,10,14,0.35)" : "rgba(140,160,190,0.14)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  // A wash of moonlight, brightest where he stands.
  const light = context.createRadialGradient(size / 2, size * 0.45, 0, size / 2, size / 2, size / 2);
  light.addColorStop(0, "rgba(150,180,220,0.18)");
  light.addColorStop(1, "rgba(150,180,220,0)");
  context.fillStyle = light;
  context.fillRect(0, 0, size, size);
}

/** A pale moon with soft grey seas on it. */
function paintMoon(context: CanvasRenderingContext2D, size: number) {
  const random = seededRandom(71);
  const centre = size / 2;
  const face = context.createRadialGradient(centre * 0.85, centre * 0.85, 0, centre, centre, centre * 0.92);
  face.addColorStop(0, "rgba(255,255,255,1)");
  face.addColorStop(0.9, "rgba(225,232,245,1)");
  face.addColorStop(1, "rgba(225,232,245,0)");
  context.fillStyle = face;
  context.fillRect(0, 0, size, size);
  context.globalCompositeOperation = "source-atop";
  for (let sea = 0; sea < 9; sea++) {
    const x = centre + (random() - 0.5) * size * 0.6;
    const y = centre + (random() - 0.5) * size * 0.6;
    const radius = 6 + random() * 16;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(120,135,160,0.45)");
    gradient.addColorStop(1, "rgba(120,135,160,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

const STONE: NoiseLook = { base: [72, 78, 88], dark: [36, 40, 48], light: [112, 120, 134], fadeOut: false };

/** An old processional way of cold blue slabs, dead leaves and rubble. */
const RUIN_GROUND: GroundDressing = {
  wash: { colour: "#7dd3fc", alpha: 0.25 },
  patches: { colours: ["rgba(140,190,230,0.18)"], count: 18, radius: [20, 50] },
  path: { kind: "slabs", colour: "#5d6a7a", edge: "#161b22", width: [0.16, 0.26] },
  litter: [
    { shape: "leaf", colours: ["#5b5a52", "#3f3d36"], count: 90, size: 5 },
    { shape: "pebble", colours: ["#6b7280", "#4b5563"], count: 50, size: 3 },
  ],
};
const paintRuinFloor = withDressing(paintPaving, RUIN_GROUND);
