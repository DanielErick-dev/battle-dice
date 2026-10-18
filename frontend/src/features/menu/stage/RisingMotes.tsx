"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color } from "three";
import { FLOOR_Y } from "./layout";

/** How high motes rise above the floor before starting again at the bottom. */
const MOTE_RISE = 2.1;

/** Glowing motes drifting up around the figure, in the character's accent. */
export function RisingMotes({ color, count }: { color: string; count: number }) {
  const sprite = useMoteSprite();
  const { geometry, motes } = useMemo(() => {
    const motes = Array.from({ length: count }, () => spawnMote(true));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    return { geometry, motes };
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const time = state.clock.elapsedTime;
    motes.forEach((mote, index) => {
      mote.height += mote.speed * delta;
      if (mote.height > MOTE_RISE) Object.assign(mote, spawnMote(false));
      const sway = Math.sin(time * 1.3 + mote.phase) * 0.06;
      positions.setXYZ(
        index,
        Math.cos(mote.angle) * mote.radius + sway,
        FLOOR_Y + mote.height,
        Math.sin(mote.angle) * mote.radius,
      );
    });
    positions.needsUpdate = true;
  });

  return (
    <points geometry={geometry}>
      <pointsMaterial
        map={sprite}
        color={new Color(color).multiplyScalar(1.6)}
        size={0.06}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/** A new mote at the floor, or (`anywhere`) along its rise so the air is full from the start. */
function spawnMote(anywhere: boolean) {
  return {
    height: anywhere ? Math.random() * MOTE_RISE : 0,
    angle: Math.random() * Math.PI * 2,
    radius: 0.25 + Math.random() * 0.5,
    speed: 0.18 + Math.random() * 0.3,
    phase: Math.random() * Math.PI * 2,
  };
}

/** A soft round dot, so the points read as embers rather than squares. */
function useMoteSprite() {
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
