"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SpriteMaterial,
  type Group,
  type Sprite,
} from "three";
import { GROUND_RADIUS } from "../kit/geometry";
import { useCanvasTexture, useCanvasTextures } from "../kit/textures";
import { ChipStacks } from "./ChipStacks";
import { FACES } from "./layout";
import { CARD_LOOKS, DIE_LOOKS, paintCasinoFloor } from "./textures";
import { useSoftDisc } from "../kit/matchAssets";

const CARD: [number, number] = [0.12, 0.17];

const BACK = FACES.length;

/** Lying on the floor; `face` is an index into FACES, or BACK for face down. */
const STREWN = [
  { x: -0.42, z: 0.44, turn: 0.4, face: 0 },
  { x: -0.36, z: 0.5, turn: 0.75, face: BACK },
  { x: 0.46, z: 0.36, turn: -0.5, face: 3 },
  { x: -0.68, z: -0.12, turn: 1.9, face: BACK },
  { x: 0.18, z: -0.58, turn: -1.1, face: 2 },
  { x: 0.72, z: -0.08, turn: 2.4, face: BACK },
];

/** Hanging in the air, turning slowly. */
const FLOATING = [
  { x: -0.64, y: 0.72, z: -0.42, face: 4, speed: 0.5, tilt: 0.25 },
  { x: 0.6, y: 0.98, z: -0.5, face: 0, speed: -0.38, tilt: -0.2 },
  { x: 0.74, y: 0.5, z: 0.06, face: 1, speed: 0.44, tilt: 0.15 },
];

const CHIP_COLOURS = ["#b3122e", "#18151a", "#e9e4da", "#2b5fb8"];

/** `colour` indexes CHIP_COLOURS. */
const STACKS = [
  { x: -0.56, z: -0.36, colour: 0, count: 8 },
  { x: -0.48, z: -0.44, colour: 1, count: 5 },
  { x: 0.48, z: -0.46, colour: 2, count: 10 },
  { x: 0.57, z: -0.37, colour: 0, count: 4 },
  { x: 0.42, z: 0.48, colour: 3, count: 3 },
  { x: -0.58, z: 0.22, colour: 1, count: 1 },
  { x: 0.3, z: 0.62, colour: 0, count: 1 },
];

const STACKS_BY_COLOUR = CHIP_COLOURS.map((_, index) => STACKS.filter((stack) => stack.colour === index));

const DIE_SIZE = 0.07;

const DICE = [
  { x: 0.3, z: -0.66, turn: 0.5, tumbling: false },
  { x: -0.22, z: 0.64, turn: -0.3, tumbling: false },
  { x: -0.7, z: -0.62, turn: 0, tumbling: true },
];

const BULBS = 15;

const BULB_RING = 0.92;

/** The back arc of the stage's rim the bulbs run along. */
const ARC_START = 0.3;

const ARC_LENGTH = Math.PI - 2 * ARC_START;

const BULB = new Color("#ffd27a").multiplyScalar(2);

/** The Crimson Jester's stage: a harlequin floor, strewn and floating cards, chips, dice and chasing marquee bulbs. */
export function CardTable() {
  const floor = useCanvasTexture({ size: 512, draw: paintCasinoFloor, seed: 17, fadeFrom: 0.3 });
  const cards = useCanvasTextures(CARD_LOOKS);
  const pips = useCanvasTextures(DIE_LOOKS);
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: floor, transparent: true, roughness: 0.6, depthWrite: false }),
      cards: cards.map((map) => new MeshStandardMaterial({ map, roughness: 0.5 })),
      die: pips.map((map) => new MeshStandardMaterial({ map, roughness: 0.35 })),
      rim: new MeshStandardMaterial({ color: "#2a0a12", roughness: 0.5, metalness: 0.3 }),
      gold: new MeshStandardMaterial({ color: "#c9a043", roughness: 0.35, metalness: 0.7 }),
      bulb: new MeshBasicMaterial({ color: BULB, toneMapped: false }),
      halo: new SpriteMaterial({
        map: disc,
        color: new Color("#ffb347"),
        opacity: 0.5,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [floor, cards, pips, disc],
  );
  useEffect(
    () => () =>
      Object.values(materials)
        .flat()
        .forEach((material) => material.dispose()),
    [materials],
  );
  const floating = useRef<(Group | null)[]>([]);
  const tumbler = useRef<Group>(null);
  const halos = useRef<(Sprite | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    floating.current.forEach((card, index) => {
      if (!card) return;
      const { y, speed } = FLOATING[index];
      card.rotation.y = t * speed + index * 2;
      card.position.y = y + Math.sin(t * 0.9 + index * 1.7) * 0.035;
    });
    if (tumbler.current) {
      tumbler.current.rotation.set(t * 0.6, t * 0.45, t * 0.3);
      tumbler.current.position.y = 0.42 + Math.sin(t * 1.1) * 0.03;
    }
    // A run of lit bulbs chasing round the arc.
    halos.current.forEach((halo, index) => {
      if (!halo) return;
      const lit = 0.5 + 0.5 * Math.cos(((index / BULBS) * 3 - t * 1.6) * Math.PI * 2);
      halo.scale.setScalar(0.05 + 0.13 * lit * lit);
    });
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {/* A low lacquered rim along the back of the stage, the bulbs on top. */}
      <mesh material={materials.rim} rotation={[-Math.PI / 2, 0, ARC_START]} position-y={0.03}>
        <torusGeometry args={[BULB_RING, 0.03, 8, 48, ARC_LENGTH]} />
      </mesh>
      <mesh material={materials.gold} rotation={[-Math.PI / 2, 0, ARC_START]} position-y={0.058}>
        <torusGeometry args={[BULB_RING, 0.008, 6, 48, ARC_LENGTH]} />
      </mesh>
      {Array.from({ length: BULBS }, (_, index) => {
        const angle = ARC_START + (index / (BULBS - 1)) * ARC_LENGTH;
        const position = [Math.cos(angle) * BULB_RING, 0.075, -Math.sin(angle) * BULB_RING] as const;
        return (
          <group key={index} position={position}>
            <mesh material={materials.bulb}>
              <sphereGeometry args={[0.012, 8, 6]} />
            </mesh>
            <sprite
              ref={(sprite) => {
                halos.current[index] = sprite;
              }}
              material={materials.halo}
            />
          </group>
        );
      })}
      {STREWN.map(({ x, z, turn, face }) => (
        <mesh
          key={`${x}:${z}`}
          material={materials.cards[face]}
          position={[x, 0.003, z]}
          rotation={[-Math.PI / 2, 0, turn]}
        >
          <planeGeometry args={CARD} />
        </mesh>
      ))}
      {FLOATING.map(({ x, y, z, face, tilt }, index) => (
        <group
          key={`${x}:${z}`}
          ref={(group) => {
            floating.current[index] = group;
          }}
          position={[x, y, z]}
        >
          <group rotation-z={tilt}>
            <mesh material={materials.cards[face]} position-z={0.0006}>
              <planeGeometry args={CARD} />
            </mesh>
            <mesh material={materials.cards[BACK]} position-z={-0.0006} rotation-y={Math.PI}>
              <planeGeometry args={CARD} />
            </mesh>
          </group>
        </group>
      ))}
      {CHIP_COLOURS.map((colour, index) => (
        <ChipStacks key={colour} colour={colour} stacks={STACKS_BY_COLOUR[index]} />
      ))}
      {DICE.map(({ x, z, turn, tumbling }) => (
        <group key={`${x}:${z}`} ref={tumbling ? tumbler : undefined} position={[x, DIE_SIZE / 2, z]} rotation-y={turn}>
          <mesh material={materials.die}>
            <boxGeometry args={[DIE_SIZE, DIE_SIZE, DIE_SIZE]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
