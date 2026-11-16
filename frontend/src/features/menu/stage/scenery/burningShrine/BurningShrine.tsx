"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Color, SpriteMaterial, type Sprite } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { useDisposal } from "../kit/dispose";
import { GlowPoints, usePointBuffers } from "../kit/GlowPoints";
import { preloadProps, useFittedProp, usePropMesh, useSoftDisc } from "../kit/matchAssets";
import { HOT_GLOW } from "../kit/materials";
import { flicker, rise, type Flicker } from "../kit/motion";
import { useRefList } from "../kit/refs";
import { useCanvasTexture } from "@/features/shared/three/canvasTexture";
import { paintFlame } from "./textures";

preloadProps(["kageStage", "kageTree"]);

const EMBER = new Color("#ff7a3c").multiplyScalar(1.8);
/**
 * The Meshy torii stage: its torii (the model's height) towering behind her, its spread (`spread`, across and in depth)
 * kept narrower so the fence and rocks fit the frame. Its round stone floor is centred a little in front of the
 * model's middle (`circleZ`, in its height) and tops out at `floor` of it: set level with her feet.
 */
const STAGE = { height: 1.75, spread: 1.15, circleZ: 0.3, floor: 0.137 };
/** Small crimson trees (a Meshy prop, 2 tall in its export) on the stone circle at her sides. */
const TREES = [
  { x: 0.48, z: -0.3, height: 0.8, turn: -0.3 },
  { x: -0.48, z: -0.34, height: 0.76, turn: 2.6 },
];
/** Patches of her black fire still burning; `tongues` is how many flames each has. */
const BLACK_FIRES = [
  { x: -0.5, z: -0.8, tongues: 5, size: 0.16 },
  { x: 0.34, z: -0.56, tongues: 4, size: 0.11 },
  { x: -0.82, z: 0.16, tongues: 3, size: 0.08 },
];
/** Black fire licks slow and tall: it burns what it touches until nothing is left. */
const LICK: Flicker = { slow: [0.2, 6], fast: [0.1, 15] };
const EMBERS = 70;
const EMBER_HEIGHT = 1.9;

/** Kage Rubra's stage in place of the rune pedestal; origin on the floor, every flame is a sprite. */
export function BurningShrine() {
  const flame = useCanvasTexture({ size: 128, draw: paintFlame });
  const stage = useFittedProp("kageStage");
  const tree = usePropMesh("kageTree");
  const materials = useMemo(
    () => ({
      blackFire: new SpriteMaterial({ map: flame, color: "#030102", transparent: true, depthWrite: false }),
      blackRim: new SpriteMaterial({ map: flame, color: "#ff2a12", opacity: 0.55, ...HOT_GLOW }),
    }),
    [flame],
  );
  useDisposal(materials);
  const [tongues, bind] = useRefList<Sprite>();
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
    fires.forEach(({ size, phase }, index) => {
      const lick = flicker(t, LICK, phase, phase * 2);
      for (const layer of [0, 1]) {
        const sprite = tongues.current[index * 2 + layer];
        if (!sprite) continue;
        // The red rim is a size larger, licking round the black core.
        const grow = layer ? 1.25 : 1;
        sprite.scale.set(size * 0.55 * grow * (2 - lick), size * 1.5 * grow * lick, 1);
        sprite.position.y = size * 0.7 * lick;
      }
    });
  });

  return (
    <group>
      <mesh
        geometry={stage.geometry}
        material={stage.material}
        scale={[STAGE.spread, STAGE.height, STAGE.spread]}
        position={[0, -STAGE.floor * STAGE.height + 0.004, -STAGE.circleZ * STAGE.spread]}
        receiveShadow
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
          <sprite ref={bind(index * 2 + 1)} material={materials.blackRim} />
          <sprite ref={bind(index * 2)} material={materials.blackFire} renderOrder={1} />
        </group>
      ))}
      <Embers />
    </group>
  );
}

/** Sparks rising off the fires, swirling wider the higher they climb. */
function Embers() {
  const disc = useSoftDisc();
  const embers = useMemo(() => {
    const random = seededRandom(89);
    return Array.from({ length: EMBERS }, () => ({
      x: (random() - 0.5) * 1.7,
      z: -0.9 + random() * 1.2,
      height: random() * EMBER_HEIGHT,
      speed: 0.18 + random() * 0.3,
      phase: random() * Math.PI * 2,
    }));
  }, []);
  const geometry = usePointBuffers(EMBERS, false);

  useFrame(({ clock }, delta) => {
    const positions = geometry.getAttribute("position");
    const t = clock.elapsedTime;
    embers.forEach((ember, index) => {
      ember.height = rise(ember.height, ember.speed * delta, EMBER_HEIGHT);
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

  return <GlowPoints geometry={geometry} map={disc} size={0.03} colour={EMBER} />;
}
