"use client";

import { Html, QuadraticBezierLine, Sparkles, Trail } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Quaternion,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type Object3D,
} from "three";
import type { Element } from "@/game/domain/types";
import { TILE_SIZE, type Vec3 } from "@/features/shared/board/boardLayout";
import { useAge } from "@/features/shared/three/useAge";
import { FireRing, FlamePillar } from "../akane/Blaze";
import { FlameCard } from "../akane/FlameCard";
import { handUnit, InHand } from "../core/inHand";

export const ELEMENT_COLOR: Readonly<Record<Element, string>> = {
  earth: "#b45309",
  water: "#38bdf8",
  fire: "#f97316",
  wind: "#a7f3d0",
};

const CONVERGENCE = "#67e8f9";
const RISE_SECONDS = 0.45;
/** A full wall knocked down over this long (the punch combo). */
const CRUMBLE_SECONDS = 2.2;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Seeded jitter so each wall's stones sit the same way on every render. */
function jitter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

/**
 * A wall of stacked stones across the path, rising out of the ground; it sinks and cracks as its hp drops, and
 * shows what's left of it above.
 */
export function StoneWall({
  position,
  heading,
  hp,
  maxHp,
  seed,
}: {
  position: Vec3;
  heading: number;
  hp: number;
  maxHp: number;
  seed: number;
}) {
  const root = useRef<Group>(null);
  const age = useAge();
  const health = maxHp > 0 ? hp / maxHp : 0;
  const stones = useMemo(() => {
    const rows = 3;
    const perRow = 4;
    const width = TILE_SIZE * 1.15;
    return Array.from({ length: rows * perRow }, (_, index) => {
      const row = Math.floor(index / perRow);
      const column = index % perRow;
      const offset = row % 2 === 0 ? 0 : width / perRow / 2;
      return {
        key: index,
        position: [
          -width / 2 + width / perRow / 2 + column * (width / perRow) + offset - (row % 2 ? width / perRow / 4 : 0),
          0.22 + row * 0.38,
          jitter(seed + index) * 0.08,
        ] as Vec3,
        scale: [width / perRow - 0.04, 0.36, 0.42 + jitter(seed * 3 + index) * 0.08] as Vec3,
        tint: index % 3 === 0 ? "#78350f" : index % 3 === 1 ? "#92400e" : "#a16207",
      };
    });
  }, [seed]);

  // Shown health eases down over a run of punches, knocking stones off from the top one by one.
  const shown = useRef(health);
  const parts = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    const rise = easeOut(clamp01(age(clock.elapsedTime) / RISE_SECONDS));
    root.current.scale.y = Math.max(0.01, rise);
    const falling = shown.current > health;
    shown.current = falling ? Math.max(health, shown.current - delta / CRUMBLE_SECONDS) : health;
    const standing = Math.ceil(stones.length * (0.25 + 0.75 * shown.current));
    parts.current.forEach((part, index) => {
      if (part) part.visible = index < standing;
    });
    // Shudders while it takes the blows.
    root.current.position.x = falling ? Math.sin(clock.elapsedTime * 60) * 0.03 : 0;
  });

  return (
    <group position={position} rotation-y={heading}>
      <group ref={root}>
        {stones.map((stone, index) => (
          <mesh
            key={stone.key}
            ref={(mesh) => {
              parts.current[index] = mesh;
            }}
            position={stone.position}
            scale={stone.scale}
            castShadow
          >
            <boxGeometry />
            <meshStandardMaterial color={stone.tint} roughness={0.95} flatShading />
          </mesh>
        ))}
      </group>
      <Html center position-y={1.75} zIndexRange={[15, 0]} style={{ pointerEvents: "none" }}>
        <div className="rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-black whitespace-nowrap text-amber-300 ring-1 ring-amber-500/40">
          🪨 {hp}/{maxHp}
        </div>
      </Html>
    </group>
  );
}

/** A rope of water from one figure to another, flowing towards the one it drags along. */
export function WaterTether({ from, to }: { from: Vec3; to: Vec3 }) {
  const outer = useRef<{ material: { dashOffset: number } } | null>(null);
  const mid: Vec3 = [(from[0] + to[0]) / 2, Math.max(from[1], to[1]) + 1.4, (from[2] + to[2]) / 2];
  const start: Vec3 = [from[0], from[1] + 0.9, from[2]];
  const end: Vec3 = [to[0], to[1] + 0.9, to[2]];
  useFrame((_, delta) => {
    if (outer.current) outer.current.material.dashOffset -= delta * 2;
  });
  return (
    <group>
      <QuadraticBezierLine
        start={start}
        end={end}
        mid={mid}
        color={ELEMENT_COLOR.water}
        lineWidth={5}
        transparent
        opacity={0.55}
      />
      <QuadraticBezierLine
        ref={outer as never}
        start={start}
        end={end}
        mid={mid}
        color="#e0f2fe"
        lineWidth={1.6}
        dashed
        dashScale={6}
        dashSize={0.6}
        gapSize={0.4}
      />
    </group>
  );
}

/** The elements he has bent since his last Convergence, circling his waist. */
export function ElementOrbit({ elements, bright = false }: { elements: readonly Element[]; bright?: boolean }) {
  const root = useRef<Group>(null);
  useFrame((_, delta) => {
    if (root.current) root.current.rotation.y += delta * (bright ? 2.4 : 1.2);
  });
  return (
    <group ref={root} position-y={0.95}>
      {elements.map((element, index) => {
        const angle = (index / Math.max(1, elements.length)) * Math.PI * 2;
        return (
          <group key={element} position={[Math.cos(angle) * 0.62, Math.sin(angle * 2) * 0.08, Math.sin(angle) * 0.62]}>
            <ElementCharm element={element} bright={bright} />
          </group>
        );
      })}
    </group>
  );
}

function ElementCharm({ element, bright }: { element: Element; bright: boolean }) {
  const color = ELEMENT_COLOR[element];
  const glow = bright ? 2.4 : 1.2;
  switch (element) {
    case "earth":
      return (
        <mesh scale={0.11}>
          <dodecahedronGeometry />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow * 0.4} flatShading />
        </mesh>
      );
    case "water":
      return (
        <mesh scale={0.1} rotation-x={Math.PI / 2}>
          <torusGeometry args={[1, 0.35, 8, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} transparent opacity={0.85} />
        </mesh>
      );
    case "fire":
      return <FlameCard width={0.22} position={[0, -0.1, 0]} seed={2.7} glow={glow} />;
    case "wind":
      return (
        <mesh scale={0.11} rotation-z={0.6}>
          <torusGeometry args={[1, 0.15, 6, 20, Math.PI * 1.5]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} />
        </mesh>
      );
  }
}

/** The Convergence: all four elements whirling fast round him, with a few sparks. */
export function ConvergenceAura() {
  return (
    <group>
      <ElementOrbit elements={["earth", "water", "fire", "wind"]} bright />
      <Sparkles count={14} scale={[1.4, 2.2, 1.4]} position-y={1} size={3} speed={1.2} color={CONVERGENCE} />
    </group>
  );
}

/** Hands smouldering: his die is enchanted for this roll. */
export function CombustionHands() {
  return <Sparkles count={16} scale={[0.9, 0.5, 0.9]} position-y={1} size={5} speed={1.2} color={ELEMENT_COLOR.fire} />;
}

/** His hidden breeze, only for his own eyes: a faint gust curling at his feet. */
export function BreezeCoil() {
  return (
    <Sparkles count={14} scale={[1.2, 0.3, 1.2]} position-y={0.15} size={3} speed={2.4} color={ELEMENT_COLOR.wind} />
  );
}

/** One bending's burst: stone shards, a splash ring, a ring of fire, a whirl of wind, the explosion or the Convergence. */
export function BendingBurst({ kind }: { kind: Element | "explosion" | "convergence" }) {
  switch (kind) {
    case "earth":
      return <StoneBurst />;
    case "water":
      return <SplashRing color={ELEMENT_COLOR.water} />;
    case "fire":
      return <FireRing reach={1.1} flames={10} />;
    case "wind":
      return <SplashRing color={ELEMENT_COLOR.wind} rising />;
    case "explosion":
      return (
        <>
          <FireRing reach={3.2} flames={18} seconds={1} />
          <FlamePillar seconds={1} size={1.2} />
        </>
      );
    case "convergence":
      return (
        <>
          <SplashRing color={CONVERGENCE} rising />
          <Sparkles count={40} scale={[2, 3, 2]} position-y={1.2} size={7} speed={2} color={CONVERGENCE} />
        </>
      );
  }
}

const BURST_SECONDS = 0.9;

function StoneBurst() {
  const root = useRef<Group>(null);
  const shards = useRef<(Mesh | null)[]>([]);
  const age = useAge();
  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime) / BURST_SECONDS;
    if (!root.current) return;
    root.current.visible = t < 1;
    shards.current.forEach((shard, index) => {
      if (!shard) return;
      const angle = (index / 8) * Math.PI * 2;
      const reach = easeOut(clamp01(t)) * 1.1;
      shard.position.set(Math.cos(angle) * reach, Math.sin(clamp01(t) * Math.PI) * 0.9, Math.sin(angle) * reach);
      shard.rotation.set(t * 6 + index, t * 4, 0);
    });
  });
  return (
    <group ref={root}>
      {Array.from({ length: 8 }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            shards.current[index] = mesh;
          }}
          scale={0.14}
        >
          <dodecahedronGeometry />
          <meshStandardMaterial color={index % 2 ? "#92400e" : "#a16207"} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function SplashRing({ color, rising = false }: { color: string; rising?: boolean }) {
  const ring = useRef<Mesh>(null);
  const age = useAge();
  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime) / BURST_SECONDS;
    if (!ring.current) return;
    ring.current.visible = t < 1;
    ring.current.scale.setScalar(0.3 + easeOut(clamp01(t)) * 1.8);
    ring.current.position.y = rising ? 0.2 + t * 1.6 : 0.1;
    (ring.current.material as MeshBasicMaterial).opacity = 0.8 * (1 - clamp01(t));
  });
  return (
    <mesh ref={ring} rotation-x={-Math.PI / 2}>
      <torusGeometry args={[1, 0.08, 8, 40]} />
      <meshBasicMaterial color={color} transparent depthWrite={false} blending={AdditiveBlending} />
    </mesh>
  );
}

/** The Breeze Heist: a streak of wind from the robbed figure to him. */
export function HeistStreak({ from, to }: { from: Vec3; to: Vec3 }) {
  const age = useAge();
  const line = useRef<{ material: { opacity: number } } | null>(null);
  useFrame(({ clock }) => {
    if (line.current) line.current.material.opacity = Math.max(0, 1 - age(clock.elapsedTime) / 1.2);
  });
  const mid: Vec3 = [(from[0] + to[0]) / 2, Math.max(from[1], to[1]) + 2, (from[2] + to[2]) / 2];
  return (
    <QuadraticBezierLine
      ref={line as never}
      start={[from[0], from[1] + 1, from[2]]}
      end={[to[0], to[1] + 1, to[2]]}
      mid={mid}
      color={ELEMENT_COLOR.wind}
      lineWidth={4}
      transparent
    />
  );
}

const EYE_LIFT = 0.09;
const EYE_FORWARD = 0.1;
const EYE_SPREAD = 0.035;

/** The Convergence lights his eyes and the rune on his brow, following his head bone. */
export function ConvergenceEyes({ figure }: { figure: Object3D }) {
  const root = useRef<Group>(null);
  const head = useMemo(() => {
    let found: Object3D | null = null;
    figure.traverse((node) => {
      if (!found && /head$/i.test(node.name)) found = node;
    });
    return found as Object3D | null;
  }, [figure]);
  const at = useMemo(() => new Vector3(), []);
  const turn = useMemo(() => new Quaternion(), []);
  useFrame(() => {
    const group = root.current;
    if (!group || !head || !group.parent) return;
    head.getWorldPosition(at);
    figure.getWorldQuaternion(turn);
    group.parent.worldToLocal(at);
    group.position.copy(at);
    group.quaternion.copy(turn);
  });
  if (!head) return null;
  return (
    <group ref={root}>
      {[-EYE_SPREAD, EYE_SPREAD].map((x) => (
        <mesh key={x} position={[x, EYE_LIFT, EYE_FORWARD]}>
          <sphereGeometry args={[0.014, 8, 8]} />
          <meshBasicMaterial color="#e0ffff" toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, EYE_LIFT + 0.065, EYE_FORWARD - 0.005]} rotation-z={Math.PI / 4}>
        <planeGeometry args={[0.035, 0.035]} />
        <meshBasicMaterial color={CONVERGENCE} toneMapped={false} side={2} />
      </mesh>
      <Sparkles
        count={6}
        scale={[0.25, 0.2, 0.25]}
        position={[0, EYE_LIFT, EYE_FORWARD]}
        size={4}
        color={CONVERGENCE}
      />
    </group>
  );
}

/** How long his hands trail the element after the bending starts. */
const TRAIL_SECONDS = 2.4;

/** The element streaming off both hands while he bends it: fire, water, a gust or dust. */
export function HandTrails({ figure, element }: { figure: Object3D; element: Element }) {
  const hands = useMemo(() => {
    const found: Object3D[] = [];
    figure.traverse((node) => {
      if (/(left|right)hand$/i.test(node.name)) found.push(node);
    });
    return found;
  }, [figure]);
  return (
    <>
      {hands.map((hand) => (
        <HandTrail key={hand.uuid} hand={hand} color={ELEMENT_COLOR[element]} element={element} />
      ))}
      {(["LeftHand", "RightHand"] as const).map((bone) => (
        <InHand key={bone} figure={figure} bone={bone}>
          {(hand) => <HandElement hand={hand} figure={figure} element={element} />}
        </InHand>
      ))}
    </>
  );
}

/** The element itself held in a hand while he bends: flames, a ring of water, orbiting stones, a whirl of wind. */
function HandElement({ hand, figure, element }: { hand: Object3D; figure: Object3D; element: Element }) {
  const root = useRef<Group>(null);
  const spin = useRef<Group>(null);
  const scratch = useMemo(() => ({ hand: new Vector3(), figure: new Vector3() }), []);
  const age = useAge();
  useFrame(({ clock }, delta) => {
    const node = root.current;
    if (!node) return;
    const t = age(clock.elapsedTime);
    node.visible = t < TRAIL_SECONDS;
    const grow = Math.min(1, t / 0.3) * Math.min(1, (TRAIL_SECONDS - t) / 0.4);
    node.scale.setScalar(handUnit(hand, figure, scratch) * Math.max(0.001, grow));
    if (spin.current) spin.current.rotation.y += delta * (element === "wind" ? 9 : 3);
  });
  const color = ELEMENT_COLOR[element];
  return (
    <group ref={root}>
      {element === "fire" && (
        <>
          <FlameCard width={0.16} seed={1.3} glow={1.6} />
          <FlameCard width={0.11} position={[0.04, 0.02, 0.03]} seed={4.1} glow={1.4} />
          <Sparkles count={10} scale={0.35} size={3} speed={2} color="#ffb347" />
        </>
      )}
      {element === "water" && (
        <group ref={spin}>
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.13, 0.025, 8, 24]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.75} />
          </mesh>
          <Sparkles count={14} scale={0.4} size={2.5} speed={1.5} color="#e0f2fe" />
        </group>
      )}
      {element === "earth" && (
        <group ref={spin}>
          {[0, 1, 2].map((index) => (
            <mesh
              key={index}
              position={[
                Math.cos((index * Math.PI * 2) / 3) * 0.14,
                0.03 * index,
                Math.sin((index * Math.PI * 2) / 3) * 0.14,
              ]}
              scale={0.045}
            >
              <dodecahedronGeometry />
              <meshStandardMaterial color={index === 1 ? "#a16207" : "#78350f"} flatShading />
            </mesh>
          ))}
          <Sparkles count={10} scale={0.4} size={2} speed={0.8} color="#d6b37a" />
        </group>
      )}
      {element === "wind" && (
        <group ref={spin}>
          {[0.1, 0.15, 0.2].map((radius, index) => (
            <mesh key={radius} rotation-x={Math.PI / 2} position-y={index * 0.04}>
              <torusGeometry args={[radius, 0.008, 6, 28, Math.PI * 1.4]} />
              <meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} />
            </mesh>
          ))}
          <Sparkles count={12} scale={0.5} size={2.5} speed={3} color={color} />
        </group>
      )}
    </group>
  );
}

function HandTrail({ hand, color, element }: { hand: Object3D; color: string; element: Element }) {
  const tip = useRef<Mesh>(null);
  const at = useMemo(() => new Vector3(), []);
  const age = useAge();
  useFrame(({ clock }) => {
    const mesh = tip.current;
    if (!mesh?.parent) return;
    hand.getWorldPosition(at);
    mesh.parent.worldToLocal(at);
    mesh.position.copy(at);
    mesh.visible = age(clock.elapsedTime) < TRAIL_SECONDS;
  });
  return (
    <>
      <Trail
        width={element === "fire" ? 0.9 : 0.6}
        length={element === "wind" ? 7 : 5}
        color={color}
        attenuation={(t) => t * t}
      >
        <mesh ref={tip}>
          <sphereGeometry args={[element === "fire" ? 0.06 : 0.04, 8, 8]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </Trail>
    </>
  );
}
