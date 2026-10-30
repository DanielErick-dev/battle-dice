"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, MeshStandardMaterial, TorusGeometry, type Group } from "three";
import { FIGURE_HEIGHT } from "../core/figure";

/** The rings of chain round the figure: how high (share of FIGURE_HEIGHT), how wide, and how many links. */
const RINGS = [
  { height: 0.3, radius: 0.5, links: 16, spin: 0.35 },
  { height: 0.52, radius: 0.46, links: 14, spin: -0.28 },
  { height: 0.72, radius: 0.42, links: 12, spin: 0.22 },
];
/** Chains hanging from the middle ring to the floor, round the figure. */
const ANCHORS = 4;
const ANCHOR_RADIUS = 0.95;
const LINK_SIZE = 0.09;
const SHOW_RATE = 4;

/**
 * Heaven's chains on the Fallen Angel (Player.chained): golden rings of chain wrapped round him,
 * slowly turning, and chains staked to the floor round him, glowing with a holy light. In the
 * figure's own frame, in world units. They tighten in as he's bound and let go once he's free.
 */
export function DivineChains({ active }: { active: boolean }) {
  const root = useRef<Group>(null);
  const rings = useRef<(Group | null)[]>([]);
  const shown = useRef(0);
  const link = useMemo(() => new TorusGeometry(LINK_SIZE, LINK_SIZE * 0.32, 6, 12), []);
  const gold = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#f6d27a",
        metalness: 0.9,
        roughness: 0.3,
        emissive: new Color("#ffd36b"),
        emissiveIntensity: 0.6,
      }),
    [],
  );
  useEffect(
    () => () => {
      link.dispose();
      gold.dispose();
    },
    [link, gold],
  );

  useFrame(({ clock }, delta) => {
    const node = root.current;
    if (!node) return;
    shown.current += ((active ? 1 : 0) - shown.current) * (1 - Math.exp(-SHOW_RATE * delta));
    node.visible = shown.current > 0.01;
    if (!node.visible) return;
    const time = clock.elapsedTime;
    // They close in from wide as they bind him.
    const grip = 1 + (1 - shown.current) * 1.5;
    rings.current.forEach((ring, index) => {
      if (!ring) return;
      ring.rotation.y = time * RINGS[index].spin;
      ring.scale.set(grip, 1, grip);
    });
    node.scale.y = shown.current;
    gold.setValues({ emissiveIntensity: 0.5 + Math.sin(time * 2.2) * 0.15 });
  });

  const middle = RINGS[1];
  return (
    <group ref={root} visible={false}>
      {RINGS.map(({ height, radius, links }, index) => (
        <group
          key={height}
          position-y={height * FIGURE_HEIGHT}
          ref={(node) => {
            rings.current[index] = node;
          }}
        >
          {Array.from({ length: links }, (_, i) => {
            const angle = (i / links) * Math.PI * 2;
            return (
              <mesh
                key={i}
                geometry={link}
                material={gold}
                position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
                // Along the ring, every other link turned across its neighbours.
                rotation={[i % 2 ? Math.PI / 2 : 0, Math.PI / 2 - angle, 0, "YXZ"]}
              />
            );
          })}
        </group>
      ))}
      {Array.from({ length: ANCHORS }, (_, i) => {
        const angle = (i / ANCHORS) * Math.PI * 2 + Math.PI / 4;
        const from: [number, number, number] = [
          Math.cos(angle) * middle.radius,
          middle.height * FIGURE_HEIGHT,
          Math.sin(angle) * middle.radius,
        ];
        const to: [number, number, number] = [Math.cos(angle) * ANCHOR_RADIUS, 0.05, Math.sin(angle) * ANCHOR_RADIUS];
        return <HangingChain key={i} from={from} to={to} link={link} material={gold} />;
      })}
    </group>
  );
}

/** A straight chain of links from `from` down to a golden stake at `to`. */
function HangingChain({
  from,
  to,
  link,
  material,
}: {
  from: [number, number, number];
  to: [number, number, number];
  link: TorusGeometry;
  material: MeshStandardMaterial;
}) {
  const [dx, dy, dz] = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(dx, dy, dz);
  const count = Math.max(2, Math.round(length / (LINK_SIZE * 1.6)));
  // Facing out toward the stake, leaning down to it.
  const heading = Math.atan2(dx, dz);
  const slant = Math.atan2(Math.hypot(dx, dz), -dy);
  return (
    <group>
      <group position={from} rotation={[-slant, heading, 0, "YXZ"]}>
        {Array.from({ length: count }, (_, i) => (
          <mesh
            key={i}
            geometry={link}
            material={material}
            position-y={-((i + 0.5) / count) * length}
            // Every other link turned across its neighbours.
            rotation-y={i % 2 ? Math.PI / 2 : 0}
          />
        ))}
      </group>
      <mesh position={to} material={material}>
        <cylinderGeometry args={[0.05, 0.08, 0.22, 8]} />
      </mesh>
    </group>
  );
}
