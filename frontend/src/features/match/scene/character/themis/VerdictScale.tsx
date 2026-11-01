"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, MeshBasicMaterial, MeshStandardMaterial, type Group, type Mesh } from "three";
import { useAge } from "../../useAge";
import { TIPPED, verdictFrame, verdictGlow } from "./verdictTimeline";

/** In the effects' units (a figure stands 1.9 tall): the pans hang over the heads of the two players. */
const PIVOT_Y = 5.2;
const COLUMN = { radius: 0.22, height: 4.3 };
const CHAIN_LENGTH = 1.5;
const PAN_RADIUS = 0.62;
const ARM_MIN = 1.4;
const ARM_MAX = 3.2;
/** Players closer than this share the space under the column: the scale stands back from them. */
const CROWDED = 2.8;
const STAND_BACK = 1.8;

const GOLD = "#d4a64a";
const MARBLE = "#ece7dd";
const JUDGEMENT = "#60a5fa";

interface VerdictScaleProps {
  /** Distance to the attacker in the effects' units, who stands along +x. */
  span: number;
  phase: "weigh" | "tip";
}

/**
 * Themis's Silent Verdict: a giant golden scale on a marble column comes down between the judge
 * (-x) and the one judged (+x), weighs, swinging, then drops on their side and strikes them.
 */
export function VerdictScale({ span, phase }: VerdictScaleProps) {
  const age = useAge();
  const root = useRef<Group>(null);
  const beam = useRef<Group>(null);
  const pans = [useRef<Group>(null), useRef<Group>(null)];
  const strike = useRef<Mesh>(null);
  const tipAt = useRef<number | null>(null);

  const crowded = span < CROWDED;
  const arm = Math.min(ARM_MAX, Math.max(ARM_MIN, span / 2));
  const materials = useMemo(
    () => ({
      gold: new MeshStandardMaterial({
        color: GOLD,
        metalness: 0.9,
        roughness: 0.3,
        emissive: "#3b2a08",
        transparent: true,
      }),
      marble: new MeshStandardMaterial({ color: MARBLE, roughness: 0.55, transparent: true }),
      glow: new MeshBasicMaterial({
        color: JUDGEMENT,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime);
    if (phase === "tip") tipAt.current ??= t;
    const frame = verdictFrame(t, tipAt.current);
    const { opacity, angle, struck } = frame;
    if (root.current) {
      root.current.visible = opacity > 0;
      root.current.position.y = frame.drop;
    }
    materials.gold.opacity = opacity;
    materials.marble.opacity = opacity;

    beam.current?.rotation.set(0, 0, angle);
    pans.forEach((pan, side) => {
      const x = (side === 0 ? -arm : arm) * Math.cos(angle);
      const y = PIVOT_Y + (side === 0 ? -arm : arm) * Math.sin(angle) - CHAIN_LENGTH;
      pan.current?.position.set(x, y, 0);
    });

    // Judgment strikes from the lowered pan down onto the attacker, a flash that fades.
    if (strike.current) {
      strike.current.visible = struck > 0 && opacity > 0;
      strike.current.scale.x = strike.current.scale.z = Math.max(0.05, 1 - struck * 1.2);
    }
    materials.glow.opacity = verdictGlow(frame);
  });

  const panY = PIVOT_Y + arm * Math.sin(TIPPED) - CHAIN_LENGTH;
  return (
    <group position={[0, 0, crowded ? -STAND_BACK : 0]}>
      <group ref={root}>
        {/* Stepped plinth and fluted column. */}
        <mesh material={materials.marble} position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.95, 1.05, 0.24, 24]} />
        </mesh>
        <mesh material={materials.marble} position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.7, 0.8, 0.2, 24]} />
        </mesh>
        <mesh material={materials.marble} position={[0, 0.44 + COLUMN.height / 2, 0]}>
          <cylinderGeometry args={[COLUMN.radius, COLUMN.radius * 1.15, COLUMN.height, 12]} />
        </mesh>
        <mesh material={materials.marble} position={[0, 0.54 + COLUMN.height, 0]}>
          <boxGeometry args={[0.7, 0.2, 0.7]} />
        </mesh>
        <mesh material={materials.gold} position={[0, PIVOT_Y + 0.35, 0]}>
          <coneGeometry args={[0.14, 0.5, 12]} />
        </mesh>
        {/* A blue halo behind the pivot, the judge's light. */}
        <mesh material={materials.glow} position={[0, PIVOT_Y, -0.1]}>
          <torusGeometry args={[0.55, 0.03, 8, 40]} />
        </mesh>

        <group ref={beam} position={[0, PIVOT_Y, 0]}>
          <mesh material={materials.gold}>
            <sphereGeometry args={[0.2, 16, 12]} />
          </mesh>
          <mesh material={materials.gold}>
            <boxGeometry args={[arm * 2, 0.12, 0.14]} />
          </mesh>
          {[-arm, arm].map((x) => (
            <mesh key={x} material={materials.gold} position={[x, 0, 0]}>
              <sphereGeometry args={[0.12, 12, 10]} />
            </mesh>
          ))}
        </group>

        {pans.map((pan, side) => (
          <group key={side} ref={pan}>
            {/* Three chains up to the end of the beam, which stays right above the pan. */}
            {[0, 1, 2].map((link) => {
              const around = (link / 3) * Math.PI * 2;
              const rim = PAN_RADIUS * 0.85;
              const lean = Math.atan2(rim, CHAIN_LENGTH);
              return (
                <mesh
                  key={link}
                  material={materials.gold}
                  position={[(Math.cos(around) * rim) / 2, CHAIN_LENGTH / 2, (Math.sin(around) * rim) / 2]}
                  rotation={[-Math.sin(around) * lean, 0, Math.cos(around) * lean]}
                >
                  <cylinderGeometry args={[0.018, 0.018, Math.hypot(CHAIN_LENGTH, rim), 5]} />
                </mesh>
              );
            })}
            <mesh material={materials.gold} scale={[1, 0.35, 1]}>
              <sphereGeometry args={[PAN_RADIUS, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            </mesh>
          </group>
        ))}

        <mesh ref={strike} material={materials.glow} position={[arm * Math.cos(TIPPED), panY / 2, 0]} visible={false}>
          <cylinderGeometry args={[0.32, 0.5, panY, 16, 1, true]} />
        </mesh>
      </group>
    </group>
  );
}
