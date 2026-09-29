"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type PointsMaterial,
} from "three";
import { useRuneTexture } from "./runeCircle";

/** Seconds a levitating figure takes to rise to its full height, and to come back down. */
export const RISE_SECONDS = 2.6;
const FALL_SECONDS = 1.5;
/** Seconds the burst of power as a levitation starts lasts. */
const BURST_SECONDS = 1.8;
const SPIRAL_MOTES = 42;
const BURST_MOTES = 64;

/** Levitation progress (0 grounded, 1 fully up) after `delta` seconds of rising (`up`) or landing. */
export function stepLevitation(progress: number, up: boolean, delta: number): number {
  const next = progress + (up ? delta / RISE_SECONDS : -delta / FALL_SECONDS);
  return Math.min(1, Math.max(0, next));
}

/** Share of the full hover height at a levitation progress: a slow start and a soft arrival. */
export function levitationLift(progress: number): number {
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}

interface AuraProps {
  /** Height of the figure, which sizes everything. */
  size: number;
  color: string;
  /** Levitation progress (0–1), read every frame. */
  progress: RefObject<number>;
  /** Hover height at full levitation, in the same units as `size`. */
  height: number;
}

/**
 * What shows a figure is levitating, drawn from the ground it left: a turning rune sigil, a
 * column of light up to its feet and motes spiralling up into it. All brighter while it's
 * still rising. Additive glow only, no lights (they'd recompile the scene).
 */
export function LevitationAura({ size, color, progress, height }: AuraProps) {
  const runes = useRuneTexture();
  const beam = useBeamTexture();
  const mote = useMoteTexture();
  const glow = useMemo(() => new Color(color).multiplyScalar(1.6), [color]);
  const root = useRef<Group>(null);
  const sigil = useRef<Mesh>(null);
  const sigilMaterial = useRef<MeshBasicMaterial>(null);
  const column = useRef<Mesh>(null);
  const columnMaterial = useRef<MeshBasicMaterial>(null);
  const motesMaterial = useRef<PointsMaterial>(null);
  const last = useRef(0);
  /** 1 while rising, easing back to 0 once up: the effects flare as the figure climbs. */
  const surge = useRef(0);
  const { geometry, motes } = useMemo(() => {
    const motes = Array.from({ length: SPIRAL_MOTES }, (_, index) => ({
      climb: index / SPIRAL_MOTES,
      angle: jitter(index, 1) * Math.PI * 2,
      speed: 0.25 + jitter(index, 2) * 0.25,
    }));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(SPIRAL_MOTES * 3), 3));
    return { geometry, motes };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    const node = root.current;
    const current = progress.current;
    if (!node) return;
    const rising = current > last.current;
    last.current = current;
    surge.current += ((rising ? 1 : 0) - surge.current) * (1 - Math.exp(-(rising ? 6 : 1.5) * delta));
    const strength = Math.min(1, current * 4);
    node.visible = strength > 0.01;
    if (!node.visible) return;

    const time = state.clock.elapsedTime;
    const lift = levitationLift(current) * height;
    if (sigil.current) {
      sigil.current.rotation.z += delta * (0.4 + surge.current * 1.6);
      sigil.current.scale.setScalar(0.85 + strength * 0.15 + Math.sin(time * 3) * 0.02);
    }
    if (sigilMaterial.current) sigilMaterial.current.opacity = strength * (0.55 + surge.current * 0.45);
    if (column.current) {
      const reach = Math.max(lift, size * 0.05);
      column.current.scale.set(1, reach, 1);
      column.current.position.y = reach / 2;
    }
    if (columnMaterial.current) columnMaterial.current.opacity = strength * (0.18 + surge.current * 0.4);
    if (motesMaterial.current) motesMaterial.current.opacity = strength * (0.6 + surge.current * 0.4);

    // Motes climb from the sigil's rim to the figure's feet, closing in as they go.
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const top = lift + size * 0.15;
    motes.forEach((particle, index) => {
      particle.climb = (particle.climb + delta * particle.speed * (1 + surge.current * 1.5)) % 1;
      particle.angle += delta * (2 + surge.current * 3);
      const radius = size * (0.34 - particle.climb * 0.2);
      positions.setXYZ(
        index,
        Math.cos(particle.angle) * radius,
        particle.climb * top,
        Math.sin(particle.angle) * radius,
      );
    });
    positions.needsUpdate = true;
  });

  return (
    <group ref={root} visible={false}>
      <mesh ref={sigil} rotation-x={-Math.PI / 2} position-y={0.03}>
        <circleGeometry args={[size * 0.38, 64]} />
        <meshBasicMaterial
          ref={sigilMaterial}
          map={runes}
          color={glow}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Unit-tall, stretched to the hover height every frame. */}
      <mesh ref={column}>
        <cylinderGeometry args={[size * 0.14, size * 0.2, 1, 32, 1, true]} />
        <meshBasicMaterial
          ref={columnMaterial}
          map={beam}
          color={glow}
          transparent
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <points geometry={geometry}>
        <pointsMaterial
          ref={motesMaterial}
          map={mote}
          color={glow}
          size={size * 0.035}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

/**
 * The burst of power as a levitation starts: two shockwaves racing out over the ground, a pillar
 * of light that flares and narrows, and motes flung up and out. Plays once; remount (new `key`)
 * to play it again.
 */
export function LevitationBurst({ size, color }: { size: number; color: string }) {
  const beam = useBeamTexture();
  const mote = useMoteTexture();
  const glow = useMemo(() => new Color(color).multiplyScalar(1.8), [color]);
  const root = useRef<Group>(null);
  const waves = useRef<(Mesh | null)[]>([]);
  const pillar = useRef<Mesh>(null);
  const pillarMaterial = useRef<MeshBasicMaterial>(null);
  const motesMaterial = useRef<PointsMaterial>(null);
  const started = useRef<number | null>(null);
  const { geometry, motes } = useMemo(() => {
    const motes = Array.from({ length: BURST_MOTES }, (_, index) => ({
      angle: jitter(index, 3) * Math.PI * 2,
      out: 0.3 + jitter(index, 4) * 0.7,
      up: 0.8 + jitter(index, 5) * 1.6,
    }));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(BURST_MOTES * 3), 3));
    return { geometry, motes };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    const node = root.current;
    if (!node) return;
    started.current ??= state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - started.current;
    const t = Math.min(1, elapsed / BURST_SECONDS);
    node.visible = t < 1;
    if (t >= 1) return;

    waves.current.forEach((wave, index) => {
      if (!wave) return;
      const local = Math.min(1, Math.max(0, (elapsed - index * 0.18) / 0.9));
      const eased = 1 - (1 - local) ** 3;
      wave.visible = local > 0 && local < 1;
      wave.scale.setScalar(0.1 + eased * size * 1.1);
      (wave.material as MeshBasicMaterial).opacity = (1 - local) * 0.9;
    });

    const flare = Math.min(1, elapsed / 0.12);
    const fade = Math.max(0, 1 - elapsed / 1.1);
    if (pillar.current) pillar.current.scale.set(0.4 + fade * 0.6, 1, 0.4 + fade * 0.6);
    if (pillarMaterial.current) pillarMaterial.current.opacity = flare * fade * 0.9;

    const positions = geometry.getAttribute("position") as BufferAttribute;
    const fly = 1 - (1 - t) ** 2;
    motes.forEach((particle, index) => {
      const radius = size * particle.out * fly * 0.8;
      positions.setXYZ(
        index,
        Math.cos(particle.angle) * radius,
        size * particle.up * fly * 0.6,
        Math.sin(particle.angle) * radius,
      );
    });
    positions.needsUpdate = true;
    if (motesMaterial.current) motesMaterial.current.opacity = 1 - t;
  });

  return (
    <group ref={root}>
      {[0, 1].map((index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            waves.current[index] = mesh;
          }}
          rotation-x={-Math.PI / 2}
          position-y={0.05}
          visible={false}
        >
          <ringGeometry args={[0.82, 1, 64]} />
          <meshBasicMaterial
            color={glow}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh ref={pillar} position-y={size * 1.25}>
        <cylinderGeometry args={[size * 0.16, size * 0.26, size * 2.5, 32, 1, true]} />
        <meshBasicMaterial
          ref={pillarMaterial}
          map={beam}
          color={glow}
          transparent
          opacity={0}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <points geometry={geometry}>
        <pointsMaterial
          ref={motesMaterial}
          map={mote}
          color={glow}
          size={size * 0.05}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

/** A stable pseudo-random number in [0, 1) for particle `index` and trait `salt`, so particles vary but render the same every time. */
function jitter(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/** Vertical fade for beams: bright at the bottom, gone at the top, with soft streaks. */
function useBeamTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;
    const gradient = context.createLinearGradient(0, 128, 0, 0);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.45)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 128);
    // Darker streaks so the column reads as flowing light, not a solid tube.
    context.globalCompositeOperation = "destination-out";
    for (let x = 0; x < 64; x += 8) {
      context.fillStyle = `rgba(0,0,0,${0.25 + ((x * 7) % 5) * 0.1})`;
      context.fillRect(x, 0, 3, 128);
    }
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** A soft round dot, so points read as glowing embers rather than squares. */
function useMoteTexture() {
  const texture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.5)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
