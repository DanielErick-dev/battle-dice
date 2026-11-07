"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, type Group, type Sprite, type SpriteMaterial } from "three";
import { jitter } from "../shared/hash";
import { useGlowColor } from "../shared/glowColor";
import { useSmokeTexture } from "./vialTextures";

/** Seconds an alchemical cloud takes to billow out and fade away. */
const CLOUD_SECONDS = 5.2;
const CLOUD_PUFFS = 32;

/**
 * A cloud of emerald smoke bursting up around a whole figure, from its feet to over its head,
 * billowing out and fading slowly. Sprites of soft smoke (always facing the camera) with a few
 * glowing ones inside. `size` is the figure's height; it bursts `delay` seconds after mounting.
 * Plays once; remount (new `key`) to replay.
 */
export function SmokeCloud({ size, color, delay = 0 }: { size: number; color: string; delay?: number }) {
  const smoke = useSmokeTexture();
  const tint = useMemo(() => new Color(color), [color]);
  const glow = useGlowColor(color, 1.5);
  const root = useRef<Group>(null);
  const sprites = useRef<(Sprite | null)[]>([]);
  const started = useRef<number | null>(null);
  const puffs = useMemo(
    () =>
      Array.from({ length: CLOUD_PUFFS }, (_, index) => ({
        angle: jitter(index, 6) * Math.PI * 2,
        radius: 0.08 + jitter(index, 7) * 0.22,
        height: 0.05 + jitter(index, 8) * 1.05,
        grow: 0.6 + jitter(index, 9) * 0.5,
        spin: (jitter(index, 10) - 0.5) * 1.5,
        glows: index % 4 === 0,
      })),
    [],
  );

  useFrame((state) => {
    const node = root.current;
    if (!node) return;
    started.current ??= state.clock.elapsedTime;
    const t = (state.clock.elapsedTime - started.current - delay) / CLOUD_SECONDS;
    node.visible = t >= 0 && t < 1;
    if (!node.visible) return;
    // Bursts out fast, then lingers, drifting up and thinning out slowly.
    const burst = 1 - (1 - Math.min(1, t * 5)) ** 3;
    puffs.forEach((puff, index) => {
      const sprite = sprites.current[index];
      if (!sprite) return;
      const spread = size * puff.radius * (0.4 + burst * 0.8 + t * 0.5);
      sprite.position.set(
        Math.cos(puff.angle + t * 0.6) * spread,
        size * (puff.height + t * 0.15),
        Math.sin(puff.angle + t * 0.6) * spread,
      );
      sprite.scale.setScalar(size * puff.grow * (0.3 + burst * 0.7 + t * 0.4));
      const material = sprite.material as SpriteMaterial;
      material.rotation = puff.spin * t * 3;
      material.opacity = (puff.glows ? 0.55 : 0.9) * burst * (1 - t) ** 1.2;
    });
  });

  return (
    <group ref={root}>
      {puffs.map((puff, index) => (
        <sprite
          key={index}
          ref={(sprite) => {
            sprites.current[index] = sprite;
          }}
        >
          <spriteMaterial
            map={smoke}
            color={puff.glows ? glow : tint}
            transparent
            opacity={0}
            depthWrite={false}
            blending={puff.glows ? AdditiveBlending : undefined}
            toneMapped={!puff.glows}
          />
        </sprite>
      ))}
    </group>
  );
}
