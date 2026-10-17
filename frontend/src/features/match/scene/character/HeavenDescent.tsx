"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
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
import { useSoftDisc } from "./softDisc";
import { useAge } from "../useAge";

/** Seconds the figure takes to come down out of the sky onto the ground. */
export const DESCENT_SECONDS = 5.2;
/** How high above the ground the descent starts, in figure heights (out of frame). */
const DESCENT_HEIGHT = 1.6;
/** Seconds the light column lingers and fades once the figure has landed. */
const LINGER_SECONDS = 1.4;
/** Seconds the landing's ring, flash and spray of light last. */
const LANDING_SECONDS = 1.3;
const FEATHERS = 18;
const SPRAY = 40;

/**
 * How high a descending figure is above the ground `t` seconds into its descent, in figure
 * heights: a slow, stately glide down out of the sky, slowing further to settle softly on its feet.
 */
export function descentHeight(t: number): number {
  const u = Math.min(1, Math.max(0, t / DESCENT_SECONDS));
  return DESCENT_HEIGHT * (1 - u) ** 2;
}

/** A steady scatter in [0, 1), so every descent looks alike. */
const scatter = (n: number) => {
  const x = Math.sin(n * 91.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Feathers shed on the way down: where they come off and how they drift to the ground. */
const DRIFT = Array.from({ length: FEATHERS }, (_, index) => ({
  angle: (index / FEATHERS) * Math.PI * 2 + scatter(index) * 0.5,
  radius: 0.18 + scatter(index + 0.1) * 0.38,
  delay: scatter(index + 0.2) * DESCENT_SECONDS * 0.7,
  fall: 2.4 + scatter(index + 0.3) * 1.4,
  spin: (scatter(index + 0.4) - 0.5) * 5,
}));

/** Motes thrown out low over the ground as the feet touch it. */
const SPRAY_MOTES = Array.from({ length: SPRAY }, (_, index) => ({
  angle: (index / SPRAY) * Math.PI * 2 + scatter(index + 0.5) * 0.3,
  speed: 0.5 + scatter(index + 0.6) * 0.7,
  lift: 0.15 + scatter(index + 0.7) * 0.5,
}));

/**
 * A figure coming down out of heaven onto the stage (see CharacterDefinition.descends): a column
 * of light falls from the sky onto the ground, feathers drift down round it, and as the feet
 * touch a ring of light rolls out over the floor with a flash and a spray of motes, then the
 * column fades. On the ground, sized by the figure's height. Additive glow only, no lights.
 */
export function HeavenDescent({ size, color }: { size: number; color: string }) {
  const beam = useBeamTexture();
  const feather = useFeatherTexture();
  const disc = useSoftDisc();
  const age = useAge();
  const glow = useMemo(() => new Color(color).lerp(new Color("#fff4c2"), 0.5).multiplyScalar(1.8), [color]);
  const column = useRef<Mesh>(null);
  const columnMaterial = useRef<MeshBasicMaterial>(null);
  const feathers = useRef<(Mesh | null)[]>([]);
  const featherMaterials = useRef<(MeshBasicMaterial | null)[]>([]);
  const landing = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const ringMaterial = useRef<MeshBasicMaterial>(null);
  const flash = useRef<Mesh>(null);
  const flashMaterial = useRef<MeshBasicMaterial>(null);
  const sprayMaterial = useRef<PointsMaterial>(null);
  const spray = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(SPRAY * 3), 3));
    return geometry;
  }, []);
  useEffect(() => () => spray.dispose(), [spray]);

  useFrame(({ clock }, delta) => {
    const t = age(clock.elapsedTime);

    // The column: in quickly, steady through the descent, fading once landed.
    const fadeIn = Math.min(1, t / 0.35);
    const fadeOut = 1 - Math.min(1, Math.max(0, (t - DESCENT_SECONDS) / LINGER_SECONDS));
    if (column.current) {
      column.current.visible = fadeOut > 0;
      column.current.rotation.y += delta * 0.4;
    }
    if (columnMaterial.current) columnMaterial.current.opacity = 0.55 * fadeIn * fadeOut;

    // Feathers drift down from above the frame, swaying, and fade out on the ground.
    DRIFT.forEach((drift, index) => {
      const mesh = feathers.current[index];
      const material = featherMaterials.current[index];
      if (!mesh || !material) return;
      const f = (t - drift.delay) / drift.fall;
      mesh.visible = f > 0 && f < 1;
      if (!mesh.visible) return;
      const height = size * (DESCENT_HEIGHT + 0.6) * (1 - f) ** 1.3;
      const angle = drift.angle + f * 1.2;
      const radius = (drift.radius + Math.sin(f * 9 + index) * 0.05) * size;
      mesh.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      mesh.rotation.set(Math.sin(f * 8 + index) * 0.9, drift.spin * f, Math.cos(f * 6 + index) * 0.7);
      material.opacity = Math.min(1, f * 6) * (f > 0.85 ? (1 - f) / 0.15 : 1);
    });

    // The landing: a ring rolling out, a flash on the floor and a spray of motes.
    const l = (t - DESCENT_SECONDS) / LANDING_SECONDS;
    if (landing.current) landing.current.visible = l >= 0 && l < 1;
    if (l < 0 || l >= 1) return;
    const out = 1 - (1 - l) ** 3;
    ring.current?.scale.setScalar(0.15 + out * 1.1 * size);
    if (ringMaterial.current) ringMaterial.current.opacity = 0.9 * (1 - l);
    flash.current?.scale.setScalar(size * (0.6 + l * 0.6));
    if (flashMaterial.current) flashMaterial.current.opacity = 0.8 * (1 - l) ** 2;
    const positions = spray.getAttribute("position") as BufferAttribute;
    SPRAY_MOTES.forEach((mote, index) => {
      const reach = mote.speed * out * size;
      const height = mote.lift * size * Math.sin(Math.min(1, l * 1.4) * Math.PI) * 0.5;
      positions.setXYZ(index, Math.cos(mote.angle) * reach, 0.02 + height, Math.sin(mote.angle) * reach);
    });
    positions.needsUpdate = true;
    if (sprayMaterial.current) sprayMaterial.current.opacity = 1 - l;
  });

  return (
    <group>
      {/* Light out of the sky onto the ground, open at both ends; it fades out before the top of
          the stage, which hides the rest of the way up (see CharacterStage's fadeTop). */}
      <mesh ref={column} position-y={size * 0.6}>
        <cylinderGeometry args={[size * 0.3, size * 0.36, size * 1.2, 32, 1, true]} />
        <meshBasicMaterial
          ref={columnMaterial}
          map={beam}
          color={glow}
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {DRIFT.map((_, index) => (
        <mesh key={index} ref={(mesh) => void (feathers.current[index] = mesh)} visible={false}>
          <planeGeometry args={[size * 0.045, size * 0.12]} />
          <meshBasicMaterial
            ref={(material) => void (featherMaterials.current[index] = material)}
            map={feather}
            color="#fffaf0"
            transparent
            opacity={0}
            side={DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      <group ref={landing} visible={false}>
        <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.012}>
          <ringGeometry args={[0.8, 1, 64]} />
          <meshBasicMaterial
            ref={ringMaterial}
            color={glow}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={flash} rotation-x={-Math.PI / 2} position-y={0.008}>
          <circleGeometry args={[1, 48]} />
          <meshBasicMaterial
            ref={flashMaterial}
            map={disc}
            color={glow}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <points geometry={spray}>
          <pointsMaterial
            ref={sprayMaterial}
            map={disc}
            color={glow}
            size={size * 0.035}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </points>
      </group>
    </group>
  );
}

/** Light fading upward, streaked so the column reads as rays rather than a solid tube. */
function useBeamTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;
    // Bright at the ground, thinning out into the sky.
    const gradient = context.createLinearGradient(0, 128, 0, 0);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.6, "rgba(255,255,255,0.4)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 128);
    context.globalCompositeOperation = "destination-out";
    for (let x = 0; x < 64; x += 6) {
      context.fillStyle = `rgba(0,0,0,${0.3 + ((x * 7) % 5) * 0.12})`;
      context.fillRect(x, 0, 2 + (x % 3), 128);
    }
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** A white feather: a soft vane round a brighter shaft, tapering to the tip. */
export function useFeatherTexture() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 96;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "rgba(255,255,255,0.85)";
    context.beginPath();
    context.moveTo(16, 2);
    context.quadraticCurveTo(31, 40, 18, 86);
    context.lineTo(14, 86);
    context.quadraticCurveTo(1, 40, 16, 2);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,1)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(16, 4);
    context.lineTo(16, 94);
    context.stroke();
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
