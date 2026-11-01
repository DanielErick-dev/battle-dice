"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type PointsMaterial,
} from "three";
import { jitter } from "../shared/hash";
import { useGlowColor } from "../shared/glowColor";
import { Vial } from "./HeldVial";
import { SmokeCloud } from "./SmokeCloud";
import { useSparkTexture } from "./vialTextures";

/** Seconds the thrown vial flies, and how long its burst lasts after shattering. */
const FLIGHT_SECONDS = 0.45;
const BURST_SECONDS = 1.6;
const SPARKS = 48;
const PUFFS = 7;

/**
 * The alchemist's ability: a vial flung from her hand arcs down in front of her and shatters
 * with golden sparks, and a cloud of emerald smoke bursts up around her. In the figure's frame (it faces +z), sized
 * by `size` (the figure's height). Plays once; remount (new `key`) to play it again. Additive
 * glow only, no lights (they'd recompile the scene).
 */
export function VialShatter({ size, color }: { size: number; color: string }) {
  const glow = useGlowColor(color, 1.6);
  const gold = useMemo(() => new Color("#fcd34d").multiplyScalar(2), []);
  const spark = useSparkTexture();
  const root = useRef<Group>(null);
  const vial = useRef<Group>(null);
  const splash = useRef<Mesh>(null);
  const puffs = useRef<(Mesh | null)[]>([]);
  const sparksMaterial = useRef<PointsMaterial>(null);
  const started = useRef<number | null>(null);
  // Where the thrown vial leaves her hand: raised at head height, a little in front and to her right.
  const from = useMemo(() => new Vector3(-size * 0.12, size * 0.9, size * 0.2), [size]);
  const to = useMemo(() => new Vector3(0, 0.05, size * 0.45), [size]);
  const { geometry, sparks } = useMemo(() => {
    const sparks = Array.from({ length: SPARKS }, (_, index) => ({
      angle: jitter(index, 1) * Math.PI * 2,
      out: 0.2 + jitter(index, 2) * 0.5,
      up: 0.3 + jitter(index, 3) * 0.7,
    }));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(SPARKS * 3), 3));
    return { geometry, sparks };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    const node = root.current;
    if (!node) return;
    started.current ??= state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - started.current;
    node.visible = elapsed < FLIGHT_SECONDS + BURST_SECONDS;
    if (!node.visible) return;

    // The flight: an arc from the hand down to the ground ahead, tumbling.
    const flight = Math.min(1, elapsed / FLIGHT_SECONDS);
    if (vial.current) {
      vial.current.visible = flight < 1;
      vial.current.position.lerpVectors(from, to, flight);
      vial.current.position.y += Math.sin(Math.PI * flight) * size * 0.18;
      vial.current.rotation.set(flight * 9, 0, flight * 4);
    }

    // The burst, once it hits the ground.
    const burst = (elapsed - FLIGHT_SECONDS) / BURST_SECONDS;
    const live = burst >= 0 && burst < 1;
    if (splash.current) {
      splash.current.visible = live;
      splash.current.scale.setScalar(0.1 + (1 - (1 - Math.max(0, burst)) ** 3) * size * 0.5);
      (splash.current.material as MeshBasicMaterial).opacity = (1 - burst) * 0.9;
    }
    puffs.current.forEach((puff, index) => {
      if (!puff) return;
      const local = Math.min(1, Math.max(0, (burst - index * 0.03) * 1.1));
      puff.visible = live && local > 0;
      const angle = (index / PUFFS) * Math.PI * 2;
      const spread = size * 0.12 * local;
      puff.position.set(
        to.x + Math.cos(angle) * spread,
        to.y + size * (0.05 + local * 0.25) * (0.6 + jitter(index, 4) * 0.8),
        to.z + Math.sin(angle) * spread,
      );
      puff.scale.setScalar(size * (0.06 + local * 0.16));
      (puff.material as MeshBasicMaterial).opacity = (1 - local) * 0.45;
    });

    const positions = geometry.getAttribute("position") as BufferAttribute;
    const fly = 1 - (1 - Math.max(0, burst)) ** 2;
    sparks.forEach((particle, index) => {
      const radius = size * particle.out * fly;
      positions.setXYZ(
        index,
        to.x + Math.cos(particle.angle) * radius,
        to.y + size * particle.up * (fly - fly * fly * 0.6),
        to.z + Math.sin(particle.angle) * radius,
      );
    });
    positions.needsUpdate = true;
    if (sparksMaterial.current) sparksMaterial.current.opacity = live ? 1 - burst : 0;
  });

  return (
    <>
      <SmokeCloud size={size} color={color} delay={FLIGHT_SECONDS} />
      <group ref={root}>
        <group ref={vial}>
          <Vial color={color} size={size * 0.03} />
        </group>
        <mesh ref={splash} position={to} rotation-x={-Math.PI / 2} visible={false}>
          <ringGeometry args={[0.7, 1, 48]} />
          <meshBasicMaterial
            color={glow}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {Array.from({ length: PUFFS }, (_, index) => (
          <mesh
            key={index}
            ref={(mesh) => {
              puffs.current[index] = mesh;
            }}
            visible={false}
          >
            <sphereGeometry args={[1, 16, 12]} />
            <meshBasicMaterial
              color={glow}
              transparent
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
        <points geometry={geometry}>
          <pointsMaterial
            ref={sparksMaterial}
            map={spark}
            color={gold}
            size={size * 0.03}
            transparent
            opacity={0}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </points>
      </group>
    </>
  );
}
