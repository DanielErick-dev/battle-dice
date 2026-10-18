"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import type { Group } from "three";
import { preloadProps, PROP_HEIGHT, usePropMesh, type PropId } from "./props";

/**
 * The chair under a figure sitting out lost turns (the shared `rest` clip), in the figure's own
 * frame (+z forward), sized for FIGURE_HEIGHT: the clip keeps the hips this high off the floor, so
 * the seat's top sits just under them, reaching forward under the thighs.
 */
const SEAT_TOP = 0.74;
const SEAT_WIDTH = 0.82;
const SEAT_DEPTH = 0.72;
const SEAT_THICKNESS = 0.08;
/** Where the seat's middle is, ahead of the hips. */
const SEAT_Z = 0.1;
const LEG = 0.07;
const BACK_HEIGHT = 1.0;
const WOOD = "#5b3a24";
const WOOD_DARK = "#3d2717";
/** How quickly the chair appears as the figure sits, and goes as it gets up. */
const SHOW_RATE = 7;

/**
 * A character's own chair (a Meshy model, see PROPS): how tall to draw it so its seat meets the
 * hips (SEAT_TOP), how far its middle sits from the hips (+z ahead) and how far round it's turned
 * to face the way the figure does.
 */
interface ChairModel {
  prop: PropId;
  height: number;
  z: number;
  turn: number;
}
const CHAIRS = {
  // The Crystal Fairy's throne of ice and fur: its cushion's top is halfway up the model.
  frostThrone: { prop: "frostThrone", height: SEAT_TOP * 2, z: 0.05, turn: 0 },
  // Akane's throne of black stone and flames: a low seat, under a third of the way up the model.
  infernalThrone: {
    prop: "infernalThrone",
    height: SEAT_TOP / 0.31,
    z: 0.05,
    turn: 0,
  },
  // Bjorn's throne of ice under a wolf's head: its seat is a little over a quarter of the way up.
  wolfThrone: { prop: "wolfThrone", height: SEAT_TOP / 0.275, z: 0.05, turn: 0 },
  // Seraphiel's throne of gold and light on its dais, and the ashen one he sits on once fallen.
  celestialThrone: { prop: "celestialThrone", height: SEAT_TOP / 0.3, z: 0.05, turn: 0 },
  ashenThrone: { prop: "ashenThrone", height: SEAT_TOP / 0.335, z: 0.05, turn: 0 },
  // Cronos's brass throne of gears: its seat sits further forward, so it's pulled back.
  clockworkThrone: { prop: "clockworkThrone", height: SEAT_TOP / 0.35, z: -0.14, turn: 0 },
  // Unidade Alva's cybernetic throne.
  cyberThrone: { prop: "cyberThrone", height: SEAT_TOP / 0.32, z: -0.03, turn: 0 },
  // Kage Rubra's throne of obsidian and red fire: a low seat, a little forward.
  obsidianThrone: { prop: "obsidianThrone", height: SEAT_TOP / 0.26, z: -0.06, turn: 0 },
  // The Elven Archer's throne of living wood.
  elderwoodThrone: { prop: "elderwoodThrone", height: SEAT_TOP / 0.33, z: 0.05, turn: 0 },
  // Nerissa's throne of coral and tide.
  tideThrone: { prop: "tideThrone", height: SEAT_TOP / 0.365, z: 0.05, turn: 0 },
  // The Ancient Monk's storm-forged throne of stone and metal.
  stormThrone: { prop: "stormThrone", height: SEAT_TOP / 0.33, z: 0.08, turn: 0 },
  // The Crimson Witch's red throne: a deep one, its seat well behind the middle, so it's pushed forward.
  crimsonThrone: { prop: "crimsonThrone", height: SEAT_TOP / 0.35, z: 0.33, turn: 0 },
  // The Card Jester's black and red throne.
  jesterThrone: { prop: "jesterThrone", height: SEAT_TOP / 0.345, z: 0.08, turn: 0 },
  // The Crimson Enchantress's throne.
  enchantressThrone: { prop: "enchantressThrone", height: SEAT_TOP / 0.33, z: 0.1, turn: 0 },
  // The Emerald Alchemist's throne of glass and brass (1.2 MB: Meshy's UV islands stop the simplifier).
  alchemistThrone: { prop: "alchemistThrone", height: SEAT_TOP / 0.38, z: 0.05, turn: 0 },
} as const satisfies Record<string, ChairModel>;
export type ChairId = keyof typeof CHAIRS;

/** Starts fetching the given chairs' models (only the roster's, so a match doesn't download them all). */
export function preloadChairs(chairs: readonly ChairId[]): void {
  preloadProps(chairs.map((chair) => CHAIRS[chair].prop));
}

/**
 * The chair that grows in under the figure while `seated` is on, and shrinks away after: their own
 * (`chair`), or a plain wooden one.
 */
export function RestChair({ seated, chair }: { seated: RefObject<boolean>; chair?: ChairId }) {
  const root = useRef<Group>(null);
  const shown = useRef(0);

  useFrame((_, delta) => {
    const node = root.current;
    if (!node) return;
    const goal = seated.current ? 1 : 0;
    shown.current += (goal - shown.current) * (1 - Math.exp(-SHOW_RATE * delta));
    node.visible = shown.current > 0.01;
    node.scale.setScalar(shown.current);
  });

  if (chair) {
    return (
      <group ref={root} visible={false}>
        <OwnChair {...CHAIRS[chair]} />
      </group>
    );
  }
  const back = SEAT_Z - SEAT_DEPTH / 2 + LEG / 2;
  const legHeight = SEAT_TOP - SEAT_THICKNESS;
  const corners = [-1, 1].flatMap((x) => [-1, 1].map((z) => [x, z] as const));
  return (
    <group ref={root} visible={false}>
      <mesh position={[0, SEAT_TOP - SEAT_THICKNESS / 2, SEAT_Z]} castShadow receiveShadow>
        <boxGeometry args={[SEAT_WIDTH, SEAT_THICKNESS, SEAT_DEPTH]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </mesh>
      {corners.map(([x, z]) => (
        <mesh
          key={`${x}${z}`}
          position={[x * (SEAT_WIDTH / 2 - LEG / 2), legHeight / 2, SEAT_Z + z * (SEAT_DEPTH / 2 - LEG / 2)]}
          castShadow
        >
          <boxGeometry args={[LEG, legHeight, LEG]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
        </mesh>
      ))}
      {/* The back: two posts carrying on from the back legs, and three rails across. */}
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * (SEAT_WIDTH / 2 - LEG / 2), SEAT_TOP + BACK_HEIGHT / 2, back]} castShadow>
          <boxGeometry args={[LEG, BACK_HEIGHT, LEG]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.85} />
        </mesh>
      ))}
      {[0.35, 0.65, 0.95].map((height) => (
        <mesh key={height} position={[0, SEAT_TOP + BACK_HEIGHT * height, back]} castShadow>
          <boxGeometry args={[SEAT_WIDTH - LEG, 0.1, 0.05]} />
          <meshStandardMaterial color={WOOD} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** A character's own chair model, standing on the floor. */
function OwnChair({ prop, height, z, turn }: ChairModel) {
  const { geometry, material } = usePropMesh(prop);
  return (
    <mesh
      geometry={geometry}
      material={material}
      scale={height / PROP_HEIGHT}
      position={[0, height / 2, z]}
      rotation-y={turn}
      castShadow
      receiveShadow
    />
  );
}
