"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, type Group, type MeshBasicMaterial } from "three";
import { seededRandom } from "@/game/domain/random";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "./boardLayout";
import { useAge } from "./useAge";

const SPIKES = 9;
const RISE_SECONDS = 0.18;
const HOLD_SECONDS = 0.55;
const SINK_SECONDS = 0.35;
const SPIKE_HEIGHT = 1.1;
// Past 1.0 so the tips glow through the bloom pass.
const FLASH_OPACITY = 0.8;
const HOT_TIP = new Color("#ff3b1f").multiplyScalar(2.2);

/**
 * A hidden trap giving itself away: iron spikes burst out of the tile with a red flash,
 * hold for a moment and sink back into the stone. Mounted with a fresh key per trap sprung.
 */
export function HiddenTrapBurst({ position }: { position: Vec3 }) {
  const spikes = useRef<Group>(null);
  const flash = useRef<MeshBasicMaterial>(null);
  const age = useAge();
  const layout = useMemo(() => {
    const random = seededRandom(position[0] * 131 + position[2] * 71);
    return Array.from({ length: SPIKES }, (_, i) => {
      const angle = (i / SPIKES) * Math.PI * 2 + random() * 0.5;
      const radius = i === 0 ? 0 : TILE_SIZE * (0.18 + random() * 0.2);
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        scale: 0.7 + random() * 0.5,
      };
    });
  }, [position]);

  useFrame(({ clock }) => {
    if (!spikes.current) return;
    const t = age(clock.elapsedTime);
    const rise = Math.min(1, t / RISE_SECONDS);
    const sink = Math.min(1, Math.max(0, (t - RISE_SECONDS - HOLD_SECONDS) / SINK_SECONDS));
    const out = rise * (1 - sink);
    spikes.current.scale.y = Math.max(0.001, out);
    spikes.current.visible = out > 0.001;
    if (flash.current) flash.current.opacity = FLASH_OPACITY * out;
  });

  return (
    <group position={[position[0], position[1] + TILE_HEIGHT / 2, position[2]]}>
      <group ref={spikes}>
        {layout.map(({ x, z, scale }, i) => (
          <mesh key={i} position={[x, (SPIKE_HEIGHT * scale) / 2, z]} castShadow>
            <coneGeometry args={[0.1 * scale, SPIKE_HEIGHT * scale, 6]} />
            <meshStandardMaterial
              color="#2a2326"
              metalness={0.8}
              roughness={0.35}
              emissive={HOT_TIP}
              emissiveIntensity={0.25}
            />
          </mesh>
        ))}
      </group>
      {/* A glow on the stone instead of a light: adding lights recompiles every material. */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
        <circleGeometry args={[TILE_SIZE * 0.55, 32]} />
        <meshBasicMaterial
          ref={flash}
          color={HOT_TIP}
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
