"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { ExtrudeGeometry, MeshStandardMaterial, type Group, type Mesh } from "three";
import { CLOCK_BAND, CLOCK_RADIUS, MODULE, TOOTH_DEPTH } from "./layout";

const CLOCK_Z = -0.92;

const CLOCK_Y = 0.98;

/** Its posts reach from the floor to where the ring's lower arc crosses them. */
const POST = CLOCK_Y - 0.2;

/** The great ring of numerals on two posts, its hands, a glowing rim, and two cogs turning at its foot. */
export function ClockRing({
  materials,
  gear,
}: {
  materials: Record<"bronze" | "brass" | "iron" | "dial" | "glow", MeshStandardMaterial>;
  gear: (teeth: number, spokes: number) => ExtrudeGeometry;
}) {
  const minute = useRef<Group>(null);
  const hour = useRef<Group>(null);
  const cogs = useRef<(Group | null)[]>([]);
  const rim = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Mostly sweeps forward; the swell of the sine briefly overtakes it and winds time back.
    const sweep = -t * 0.6 + 3.4 * Math.sin(t * 0.22);
    if (minute.current) minute.current.rotation.z = sweep;
    if (hour.current) hour.current.rotation.z = sweep / 12 + 0.8;
    const speed = -0.6 + 3.4 * 0.22 * Math.cos(t * 0.22);
    // The rim flares while time runs backwards.
    if (rim.current)
      (rim.current.material as MeshStandardMaterial).opacity = 0.35 + 0.4 * Math.min(1, Math.max(0, speed));
    cogs.current.forEach((cog, index) => {
      if (cog) cog.rotation.y = index % 2 ? -(10 / 7) * sweep * 0.5 + Math.PI - Math.PI / 7 : sweep * 0.5;
    });
  });

  const inner = CLOCK_RADIUS - CLOCK_BAND;
  return (
    <group position={[0, CLOCK_Y, CLOCK_Z]}>
      <mesh material={materials.dial}>
        <ringGeometry args={[inner, CLOCK_RADIUS, 72]} />
      </mesh>
      {[CLOCK_RADIUS, inner].map((radius) => (
        <mesh key={radius} material={materials.brass}>
          <torusGeometry args={[radius, 0.014, 8, 72]} />
        </mesh>
      ))}
      <mesh ref={rim} material={materials.glow} position-z={-0.01}>
        <torusGeometry args={[CLOCK_RADIUS + 0.025, 0.012, 6, 72]} />
      </mesh>
      <mesh material={materials.brass} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.035, 0.035, 0.04, 16]} />
      </mesh>
      <group ref={minute} position-z={0.03}>
        <mesh material={materials.iron} position-y={inner * 0.47}>
          <boxGeometry args={[0.022, inner * 0.94, 0.01]} />
        </mesh>
      </group>
      <group ref={hour} position-z={0.02}>
        <mesh material={materials.iron} position-y={inner * 0.3}>
          <boxGeometry args={[0.034, inner * 0.6, 0.012]} />
        </mesh>
      </group>
      {/* The posts it stands on, reaching down to the floor. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (CLOCK_RADIUS - 0.04), -CLOCK_Y + POST / 2, -0.02]}>
          <mesh material={materials.bronze}>
            <boxGeometry args={[0.05, POST, 0.05]} />
          </mesh>
          <mesh material={materials.iron} position-y={-POST / 2 + 0.02}>
            <boxGeometry args={[0.1, 0.04, 0.1]} />
          </mesh>
        </group>
      ))}
      {[
        { x: 0.34, y: -0.7, teeth: 10 },
        { x: 0.34 + (10 + 7) * MODULE - TOOTH_DEPTH, y: -0.7, teeth: 7 },
      ].map(({ x, y, teeth }, index) => (
        <group key={index} position={[x, y, 0.03]} rotation-x={Math.PI / 2}>
          <group ref={(group) => void (cogs.current[index] = group)}>
            <mesh geometry={gear(teeth, 3)} material={materials.brass} />
          </group>
        </group>
      ))}
    </group>
  );
}
