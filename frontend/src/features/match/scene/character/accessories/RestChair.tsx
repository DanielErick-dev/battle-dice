"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import type { Group } from "three";
import { PROP_HEIGHT, usePropMesh } from "../core/props";
import { approach } from "../shared/easing";
import { CHAIRS, SEAT_TOP, type ChairId, type ChairModel } from "./chairs";

/**
 * The chair under a figure sitting out lost turns (the shared `rest` clip), in the figure's own
 * frame (+z forward), sized for FIGURE_HEIGHT: the seat reaches forward under the thighs.
 */
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
 * The chair that grows in under the figure while `seated` is on, and shrinks away after: their own
 * (`chair`), or a plain wooden one.
 */
export function RestChair({
  seated,
  chair,
  seat = { scale: 1, turn: 0 },
}: {
  seated: RefObject<boolean>;
  chair?: ChairId;
  seat?: { scale: number; turn: number };
}) {
  const root = useRef<Group>(null);
  const shown = useRef(0);

  useFrame((_, delta) => {
    const node = root.current;
    if (!node) return;
    shown.current = approach(shown.current, seated.current ? 1 : 0, SHOW_RATE, delta);
    node.visible = shown.current > 0.01;
    node.scale.setScalar(shown.current);
  });

  if (chair) {
    return (
      <group ref={root} visible={false}>
        <group scale={seat.scale} rotation-y={seat.turn}>
          <OwnChair {...CHAIRS[chair]} />
        </group>
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
