"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  LatheGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SpriteMaterial,
  Vector2,
  type Mesh,
  type Sprite,
  type Texture,
} from "three";
import { GROUND_RADIUS, taperedTube } from "../kit/geometry";
import { useCanvasTexture } from "../kit/textures";
import { Flask } from "./Flask";
import { FlaskBubbles } from "./FlaskBubbles";
import { BENCH, BENCH_TOP, flaskHeight, FLASKS } from "./layout";
import { paintChalkCircle, paintLabFloor } from "./textures";
import { useSoftDisc } from "../kit/matchAssets";

const CIRCLE_SIZE = 1.3;

const ALEMBIC = { x: 0.56, z: -0.6, turn: -0.5 };

/** The still's pot outline, bottom up, before it's turned; it sits on a stand this high. */
const POT_PROFILE = [
  [0, 0],
  [0.07, 0.01],
  [0.1, 0.05],
  [0.1, 0.1],
  [0.075, 0.15],
  [0.04, 0.17],
  [0.035, 0.2],
] as const;

const STAND = 0.1;

const HEAD_Y = STAND + 0.2;

const BEAK: [number, number, number][] = [
  [0.03, HEAD_Y + 0.04, 0],
  [0.14, HEAD_Y + 0.02, 0.01],
  [0.24, 0.26, 0.03],
  [0.31, 0.19, 0.04],
];

const RECEIVER = { x: 0.31, z: 0.04, size: 0.05 };

const LIQUID_GLOW = 1.5;

const FLAME = new Color("#7dffb0").multiplyScalar(2);

/** The Emerald Alchemist's stage: tiled floor, a chalk circle, a bench of bubbling flasks and a brass still. */
export function AlchemyLab() {
  const tiles = useCanvasTexture({ size: 512, draw: paintLabFloor, seed: 13, fadeFrom: 0.3 });
  const chalk = useCanvasTexture({ size: 512, draw: paintChalkCircle, seed: 3 });
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: tiles, transparent: true, roughness: 0.8, depthWrite: false }),
      chalk: new MeshBasicMaterial({
        map: chalk,
        color: "#e6fff2",
        opacity: 0.65,
        transparent: true,
        depthWrite: false,
      }),
      circleGlow: new MeshBasicMaterial({
        map: chalk,
        color: "#10b981",
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
      wood: new MeshStandardMaterial({ color: "#3b2617", roughness: 0.9 }),
      darkWood: new MeshStandardMaterial({ color: "#24170e", roughness: 1 }),
      glass: new MeshStandardMaterial({
        color: "#d6fff0",
        transparent: true,
        opacity: 0.28,
        roughness: 0.05,
        depthWrite: false,
      }),
      cork: new MeshStandardMaterial({ color: "#8a6a45", roughness: 1 }),
      brass: new MeshStandardMaterial({ color: "#b8873a", metalness: 0.55, roughness: 0.38 }),
      iron: new MeshStandardMaterial({ color: "#232326", metalness: 0.6, roughness: 0.6 }),
      leather: new MeshStandardMaterial({ color: "#1f3b2c", roughness: 0.75 }),
      paper: new MeshStandardMaterial({ color: "#d2c6a4", roughness: 0.9 }),
      liquids: FLASKS.map(({ liquid }) => liquidMaterial(liquid)),
      distillate: liquidMaterial("#3cf2a8"),
      halo: glowSprite(disc, new Color("#22e39a"), 0.16),
      spill: new MeshBasicMaterial({
        map: disc,
        color: "#22e39a",
        opacity: 0.45,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      flame: glowSprite(disc, FLAME, 1),
    }),
    [tiles, chalk, disc],
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
      pot: new LatheGeometry(
        POT_PROFILE.map(([x, y]) => new Vector2(x, y)),
        24,
      ),
      beak: taperedTube(BEAK, 0.014, 0.55),
    }),
    [],
  );
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries]);
  const flames = useRef<(Sprite | null)[]>([]);
  const drop = useRef<Mesh>(null);
  const circleGlow = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (circleGlow.current)
      (circleGlow.current.material as MeshBasicMaterial).opacity = 0.35 + 0.25 * Math.sin(t * 1.2);
    flames.current.forEach((flame, index) => {
      if (!flame) return;
      const flicker = 1 + 0.14 * Math.sin(t * 14 + index * 2.1) + 0.07 * Math.sin(t * 31 + index);
      flame.scale.set(0.035 * flicker, 0.06 * (2 - flicker), 1);
    });
    if (drop.current) {
      // A drop gathers at the beak's tip, then falls into the receiver.
      const life = (t * 0.55) % 1;
      const [x, y, z] = BEAK[BEAK.length - 1];
      const fall = life < 0.7 ? 0 : (life - 0.7) / 0.3;
      drop.current.position.set(x, y - 0.012 - fall * fall * 0.07, z);
      drop.current.scale.setScalar(0.006 * Math.min(1, life / 0.7 + 0.3));
    }
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      <mesh material={materials.chalk} rotation-x={-Math.PI / 2} position-y={0.003} renderOrder={1}>
        <planeGeometry args={[CIRCLE_SIZE, CIRCLE_SIZE]} />
      </mesh>
      <mesh
        ref={circleGlow}
        material={materials.circleGlow}
        rotation-x={-Math.PI / 2}
        position-y={0.004}
        renderOrder={2}
      >
        <planeGeometry args={[CIRCLE_SIZE, CIRCLE_SIZE]} />
      </mesh>
      <group position={[BENCH.x, 0, BENCH.z]} rotation-y={BENCH.turn}>
        <mesh material={materials.wood} position-y={BENCH.height}>
          <boxGeometry args={[BENCH.width, 0.035, BENCH.depth]} />
        </mesh>
        <mesh material={materials.darkWood} position-y={0.14}>
          <boxGeometry args={[BENCH.width - 0.06, 0.025, BENCH.depth - 0.04]} />
        </mesh>
        {[-1, 1].flatMap((sideX) =>
          [-1, 1].map((sideZ) => (
            <mesh
              key={`${sideX}:${sideZ}`}
              material={materials.darkWood}
              position={[sideX * (BENCH.width / 2 - 0.03), BENCH.height / 2, sideZ * (BENCH.depth / 2 - 0.025)]}
            >
              <boxGeometry args={[0.035, BENCH.height, 0.035]} />
            </mesh>
          )),
        )}
        {FLASKS.map((flask, index) => (
          <group key={index} position={[flask.x, BENCH_TOP, flask.z]}>
            <Flask {...flask} glass={materials.glass} liquid={materials.liquids[index]} cork={materials.cork} />
            <sprite material={materials.halo} position-y={flaskHeight(flask) * 0.4} scale={flask.size * 6} />
          </group>
        ))}
        <FlaskBubbles />
        {/* Below: a stoppered jar and a ledger. */}
        <group position={[-0.16, 0.1525, 0]}>
          <Flask kind="tall" size={0.035} glass={materials.glass} liquid={materials.liquids[2]} cork={materials.cork} />
        </group>
        <mesh material={materials.leather} position={[0.12, 0.1525 + 0.02, 0.01]} rotation-y={0.2}>
          <boxGeometry args={[0.18, 0.04, 0.13]} />
        </mesh>
        <mesh material={materials.paper} position={[0.124, 0.1525 + 0.02, 0.01]} rotation-y={0.2}>
          <boxGeometry args={[0.172, 0.03, 0.133]} />
        </mesh>
      </group>
      <group position={[ALEMBIC.x, 0, ALEMBIC.z]} rotation-y={ALEMBIC.turn}>
        {/* A three-legged stand with a burner under the pot. */}
        {[0, 1, 2].map((leg) => {
          const angle = (leg / 3) * Math.PI * 2;
          return (
            <mesh
              key={leg}
              material={materials.iron}
              position={[Math.cos(angle) * 0.085, STAND / 2, Math.sin(angle) * 0.085]}
            >
              <cylinderGeometry args={[0.007, 0.007, STAND, 6]} />
            </mesh>
          );
        })}
        <mesh material={materials.iron} position-y={STAND} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.085, 0.008, 6, 24]} />
        </mesh>
        <mesh material={materials.brass} position-y={0.012}>
          <cylinderGeometry args={[0.03, 0.035, 0.024, 12]} />
        </mesh>
        {[-0.012, 0.012].map((x, index) => (
          <sprite
            key={index}
            ref={(sprite) => {
              flames.current[index] = sprite;
            }}
            material={materials.flame}
            position={[x, 0.05, 0]}
          />
        ))}
        <sprite material={materials.halo} position-y={0.05} scale={0.3} />
        <mesh geometry={geometries.pot} material={materials.brass} position-y={STAND} />
        <mesh material={materials.brass} position-y={HEAD_Y}>
          <sphereGeometry args={[0.055, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh geometry={geometries.beak} material={materials.brass} />
        <mesh ref={drop} material={materials.distillate}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
        <group position={[RECEIVER.x, 0, RECEIVER.z]}>
          <Flask kind="round" size={RECEIVER.size} glass={materials.glass} liquid={materials.distillate} />
          <sprite material={materials.halo} position-y={RECEIVER.size} scale={0.3} />
        </group>
      </group>
      {/* A vial knocked over, its brew glowing on the tiles. */}
      <group position={[0.52, 0, 0.3]} rotation-y={-0.7}>
        <mesh material={materials.spill} position={[0.07, 0.003, 0]} rotation-x={-Math.PI / 2} renderOrder={1}>
          <planeGeometry args={[0.3, 0.22]} />
        </mesh>
        <group position={[0, 0.02, 0]} rotation-z={Math.PI / 2}>
          <Flask kind="tall" size={0.02} glass={materials.glass} liquid={materials.liquids[0]} cork={materials.cork} />
        </group>
      </group>
      <group position={[-0.62, 0, 0.26]} rotation-y={0.6}>
        <mesh material={materials.leather} position-y={0.02}>
          <boxGeometry args={[0.19, 0.04, 0.14]} />
        </mesh>
        <mesh material={materials.paper} position={[0.004, 0.02, 0]}>
          <boxGeometry args={[0.182, 0.03, 0.143]} />
        </mesh>
      </group>
    </group>
  );
}

function liquidMaterial(color: string): MeshBasicMaterial {
  return new MeshBasicMaterial({ color: new Color(color).multiplyScalar(LIQUID_GLOW), toneMapped: false });
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
