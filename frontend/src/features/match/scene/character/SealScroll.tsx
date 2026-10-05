"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, type Group, type Mesh, type MeshBasicMaterial } from "three";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../boardLayout";
import { useAge } from "../useAge";
import { EFFECT_SCALE } from "./figure";
import { NameTag } from "./NameTag";

const TILE_TOP = TILE_HEIGHT / 2;
/** The scroll: length and radius, how high it floats over the tile and how much it bobs. */
const SCROLL_LENGTH = TILE_SIZE * 0.42;
const SCROLL_RADIUS = TILE_SIZE * 0.05;
const FLOAT_HEIGHT = 0.35;
const BOB = 0.06;
/** Radians per second the scroll turns, and the rune ring under it. */
const TURN_RATE = 0.5;
const RING_TURN_RATE = -0.3;

/**
 * A forbidden seal on its tile, the same for every kind so nobody but its writer knows which it
 * is: a closed parchment scroll bound with a blood-red band, floating and slowly turning over a
 * ring of runes glowing in its writer's colour. Its writer alone also sees its name (`label`).
 * Snaps in as it's written.
 */
export function SealScroll({ position, color, label }: { position: Vec3; color: string; label?: string }) {
  const root = useRef<Group>(null);
  const scroll = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const ringMaterial = useRef<MeshBasicMaterial>(null);
  const glow = useMemo(() => new Color(color).multiplyScalar(1.8), [color]);
  const age = useAge();
  // Seals written together shouldn't bob in step.
  const phase = useMemo(() => (position[0] * 3.1 + position[2] * 1.7) % (Math.PI * 2), [position]);

  useFrame(({ clock }, delta) => {
    const t = age(clock.elapsedTime);
    root.current?.scale.setScalar(Math.min(1, 0.3 + t * 3));
    if (scroll.current) {
      scroll.current.position.y = FLOAT_HEIGHT + Math.sin(clock.elapsedTime * 1.8 + phase) * BOB;
      scroll.current.rotation.y += delta * TURN_RATE;
    }
    if (ring.current) ring.current.rotation.z += delta * RING_TURN_RATE;
    if (ringMaterial.current) ringMaterial.current.opacity = 0.45 + 0.25 * Math.sin(clock.elapsedTime * 2.4 + phase);
  });

  return (
    <group ref={root} position={[position[0], position[1] + TILE_TOP, position[2]]}>
      <group ref={scroll}>
        {/* Lying on its side: the roll, its two wooden ends and the band that seals it. */}
        <group rotation-z={Math.PI / 2}>
          <mesh castShadow>
            <cylinderGeometry args={[SCROLL_RADIUS, SCROLL_RADIUS, SCROLL_LENGTH, 20]} />
            <meshStandardMaterial color="#e9dcbc" roughness={0.85} />
          </mesh>
          {[1, -1].map((side) => (
            <mesh key={side} position-y={(side * SCROLL_LENGTH) / 2}>
              <cylinderGeometry args={[SCROLL_RADIUS * 1.35, SCROLL_RADIUS * 1.35, SCROLL_RADIUS * 0.6, 16]} />
              <meshStandardMaterial color="#3b2416" roughness={0.6} />
            </mesh>
          ))}
          <mesh>
            <cylinderGeometry args={[SCROLL_RADIUS * 1.08, SCROLL_RADIUS * 1.08, SCROLL_RADIUS * 1.1, 20]} />
            <meshStandardMaterial color="#7f1d1d" emissive="#b91c1c" emissiveIntensity={0.6} roughness={0.4} />
          </mesh>
        </group>
      </group>
      {/* For its writer's eyes only: which seal it is. */}
      {label && <NameTag text={label} color="#f0abfc" y={FLOAT_HEIGHT + 0.4} size={EFFECT_SCALE} />}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.03}>
        <ringGeometry args={[TILE_SIZE * 0.26, TILE_SIZE * 0.36, 6, 1]} />
        <meshBasicMaterial
          ref={ringMaterial}
          color={glow}
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
