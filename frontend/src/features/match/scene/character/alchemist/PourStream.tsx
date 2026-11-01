"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Vector3, type Points } from "three";
import { useGlowColor } from "../shared/glowColor";
import { useSparkTexture } from "./vialTextures";

/** Drops in flight at once in a pour, and how fast they fall (world units/s², scaled by the figure). */
const POUR_DROPS = 40;
const POUR_GRAVITY = 5.5;

/**
 * Glowing liquid pouring from a vial down to the floor (local y = 0 of wherever it's placed):
 * drops leave `mouth` (world space) while `pouring` is on and fall under gravity. `size` is
 * the figure's height.
 */
export function PourStream({
  size,
  color,
  mouth,
  pouring,
}: {
  size: number;
  color: string;
  mouth: RefObject<Vector3>;
  pouring: RefObject<boolean>;
}) {
  const glow = useGlowColor(color, 2);
  const spark = useSparkTexture();
  const points = useRef<Points>(null);
  const spawn = useRef(0);
  const { geometry, drops } = useMemo(() => {
    const drops = Array.from({ length: POUR_DROPS }, () => ({ live: false, x: 0, y: 0, z: 0, fall: 0 }));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(POUR_DROPS * 3), 3));
    return { geometry, drops };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const local = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    const node = points.current;
    if (!node?.parent || !mouth.current) return;
    if (pouring.current) spawn.current += delta * 60;
    const gravity = POUR_GRAVITY * (size / 1.7);
    drops.forEach((drop, index) => {
      if (!drop.live && spawn.current >= 1) {
        spawn.current -= 1;
        node.parent!.worldToLocal(local.copy(mouth.current!));
        Object.assign(drop, { live: true, x: local.x, y: local.y, z: local.z, fall: 0 });
      }
      if (drop.live) {
        drop.fall += gravity * delta;
        drop.y -= drop.fall * delta;
        if (drop.y <= 0) drop.live = false;
      }
      geometry.getAttribute("position").setXYZ(index, drop.x, drop.live ? drop.y : -100, drop.z);
    });
    spawn.current = Math.min(spawn.current, 1);
    geometry.getAttribute("position").needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={spark}
        color={glow}
        size={size * 0.022}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
