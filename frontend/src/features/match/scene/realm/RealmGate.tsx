"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, DoubleSide, NormalBlending, type Group, type ShaderMaterial } from "three";
import type { RealmKind } from "@/game/domain/types";
import { TILE_HEIGHT, type Vec3 } from "@/features/shared/board/boardLayout";
import { FIRE_FRAGMENT, PILLAR_FRAGMENT, PIT_FRAGMENT, SEAL_FRAGMENT } from "./gate/shaders";
import { gateStrength, gateWidth } from "./gate/timeline";
import { UV_VERTEX } from "./glsl";

/** Each realm's gate: a disc on the tile, a column over it (open-ended cylinder) and sparks. */
const LOOK = {
  infernal: {
    disc: { radius: 1.05, fragment: PIT_FRAGMENT, blending: NormalBlending },
    column: { args: [1.7, 0.75, 4.2, 48, 1, true], y: 2.1, fragment: FIRE_FRAGMENT },
    sparks: { count: 60, scale: [2.6, 5, 2.6], y: 2.4, size: 6, speed: 2.4, color: "#ff7a2a" },
  },
  celestial: {
    disc: { radius: 1.15, fragment: SEAL_FRAGMENT, blending: AdditiveBlending },
    column: { args: [1.25, 0.95, 30, 48, 1, true], y: 15, fragment: PILLAR_FRAGMENT },
    sparks: { count: 70, scale: [2.2, 7, 2.2], y: 3, size: 5, speed: 1.2, color: "#fff1b8" },
  },
} as const;

interface RealmGateProps {
  realm: RealmKind;
  /** The portal tile the gate opens on. */
  position: Vec3;
}

/**
 * The portal tearing open into a realm (mount with a fresh key per entry). Infernal: a pit
 * opens in the tile and hellfire whirls up out of it. Celestial: a pillar of light pours down
 * from the sky onto a glowing seal.
 */
export function RealmGate({ realm, position }: RealmGateProps) {
  const born = useRef<number | null>(null);
  const group = useRef<Group>(null);
  const materials = useRef<(ShaderMaterial | null)[]>([]);
  const uniforms = useMemo(() => [0, 1].map(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 } })), []);
  const { disc, column, sparks } = LOOK[realm];

  useFrame(({ clock }, delta) => {
    born.current ??= clock.elapsedTime;
    const age = clock.elapsedTime - born.current;
    const strength = gateStrength(age);
    materials.current.forEach((material) => {
      if (!material) return;
      material.uniforms.uTime.value += delta;
      material.uniforms.uOpacity.value = strength;
    });
    if (group.current) {
      group.current.visible = strength > 0.001;
      const grow = gateWidth(age);
      group.current.scale.set(grow, 1, grow);
    }
  });

  const top = TILE_HEIGHT / 2 + 0.02;
  const register = (i: number) => (material: ShaderMaterial | null) => {
    // eslint-disable-next-line react-hooks/refs -- only a ref callback writes this ref, at commit
    materials.current[i] = material;
  };

  return (
    <group position={position}>
      <group ref={group}>
        <mesh rotation-x={-Math.PI / 2} position-y={top + 0.01}>
          <circleGeometry args={[disc.radius, 64]} />
          <shaderMaterial
            ref={register(0)}
            vertexShader={UV_VERTEX}
            fragmentShader={disc.fragment}
            uniforms={uniforms[0]}
            transparent
            depthWrite={false}
            blending={disc.blending}
          />
        </mesh>
        <mesh position-y={top + column.y}>
          <cylinderGeometry args={column.args} />
          <shaderMaterial
            ref={register(1)}
            vertexShader={UV_VERTEX}
            fragmentShader={column.fragment}
            uniforms={uniforms[1]}
            transparent
            depthWrite={false}
            side={DoubleSide}
            blending={AdditiveBlending}
          />
        </mesh>
        <Sparkles
          count={sparks.count}
          scale={[...sparks.scale]}
          position-y={sparks.y}
          size={sparks.size}
          speed={sparks.speed}
          color={sparks.color}
        />
      </group>
    </group>
  );
}
