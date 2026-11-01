"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Color, MeshStandardMaterial, SpriteMaterial, type Sprite } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { useDisposal } from "../kit/dispose";
import { GroundDisc } from "../kit/Floor";
import { GlowPoints, usePointBuffers } from "../kit/GlowPoints";
import { usePropMesh, useSoftDisc } from "../kit/matchAssets";
import { HOT_GLOW } from "../kit/materials";
import { flicker, rise, type Flicker } from "../kit/motion";
import { useRefList } from "../kit/refs";
import { useCanvasTexture } from "../kit/textures";
import { paintFlame, paintShrineGround } from "./textures";

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
/** Black fire licks slow and tall: it burns what it touches until nothing is left. */
const LICK: Flicker = { slow: [0.2, 6], fast: [0.1, 15] };
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
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: tiles, transparent: true, roughness: 0.9, depthWrite: false }),
      blackFire: new SpriteMaterial({ map: flame, color: "#030102", transparent: true, depthWrite: false }),
      blackRim: new SpriteMaterial({ map: flame, color: "#ff2a12", opacity: 0.55, ...HOT_GLOW }),
    }),
    [tiles, flame],
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
      <GroundDisc material={materials.floor} radius={FLOOR_RADIUS} />
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
