"use client";

import type { Color } from "three";
import type { RealmKind } from "@/game/domain/types";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { PILLAR_HEIGHT } from "./layout";

/** A pillar against the wall: fluted marble crowned with gold, or a rough column of basalt. */
export function Pillar({ realm, glow, position }: { realm: RealmKind; glow: Color; position: Vec3 }) {
  const celestial = realm === "celestial";
  return (
    <group position={position}>
      <mesh position-y={PILLAR_HEIGHT / 2} castShadow>
        <cylinderGeometry args={[0.2, 0.24, PILLAR_HEIGHT, celestial ? 16 : 6]} />
        <meshStandardMaterial color={celestial ? "#f7f8fc" : "#2a1510"} roughness={celestial ? 0.3 : 0.9} />
      </mesh>
      <mesh position-y={PILLAR_HEIGHT}>
        <boxGeometry args={[0.55, 0.14, 0.55]} />
        {celestial ? (
          <meshStandardMaterial
            color="#e8c766"
            metalness={0.8}
            roughness={0.3}
            emissive="#a07a20"
            emissiveIntensity={0.4}
          />
        ) : (
          <meshBasicMaterial color={glow} toneMapped={false} />
        )}
      </mesh>
    </group>
  );
}
