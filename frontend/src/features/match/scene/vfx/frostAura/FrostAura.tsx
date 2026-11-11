"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { BufferAttribute, Mesh, Sprite } from "three";
import { useCrackTexture } from "@/features/characters/shared/ice";
import { useSoftDisc } from "@/features/characters/shared/softDisc";
import {
  BURST_SECONDS,
  BURST_STAGGER,
  CHEST,
  clamp01,
  easeOut,
  FLAKE_RISE_SECONDS,
  FLASH_SECONDS,
  FROST_RADIUS,
  HEIGHT,
  IGNITE_RATE,
  makeCrystals,
  makeFlakes,
  MELT_RATE,
  WAVE_RADIUS,
  WAVE_SECONDS,
} from "./layout";
import { createFrostMaterials, createGlintMaterials } from "./materials";
import { useStarTexture } from "./starTexture";

/**
 * Bjorn's Untamed, while it lasts: a blizzard hugging him (see shader.ts), tiny ice
 * crystals orbiting him and glinting now and then, snow swirling up and a little frost under his
 * feet. It takes hold `delay` seconds after `active` comes on (as the cast clip's blow on his chest
 * lands): the crystals burst out of his chest to their orbits, with a flash and a cold wave over the
 * ground. When it ends, it melts away and the crystals drop. In the token's effects frame (see
 * EFFECT_SCALE), like EnergyAura.
 */
export function FrostAura({ active, delay }: { active: boolean; delay: number }) {
  const cracks = useCrackTexture();
  const disc = useSoftDisc();
  const star = useStarTexture();
  const crystals = useMemo(() => makeCrystals(), []);
  const flakes = useMemo(() => makeFlakes(), []);
  const materials = useMemo(() => createFrostMaterials(cracks, disc), [cracks, disc]);
  const glintMaterials = useMemo(() => createGlintMaterials(crystals.length, star), [crystals, star]);
  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
      glintMaterials.forEach((material) => material.dispose());
      crystals.forEach(({ geometry }) => geometry.dispose());
      flakes.geometry.dispose();
    },
    [materials, glintMaterials, crystals, flakes],
  );

  const crystalMeshes = useRef<(Mesh | null)[]>([]);
  const glintSprites = useRef<(Sprite | null)[]>([]);
  const frost = useRef<Mesh>(null);
  const wave = useRef<Mesh>(null);
  const flash = useRef<Sprite>(null);
  /** When it took hold (clock seconds); how strong it is (0 to 1), rising as it takes hold and falling as it melts. */
  const heldSince = useRef<number | null>(null);
  const wasActive = useRef(false);
  const power = useRef(0);

  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime;
    // Taking hold from nothing; back on before it has melted (the cast handing over to the
    // ability itself), it simply carries on.
    if (active && !wasActive.current && power.current <= 0.01) heldSince.current = now + delay;
    wasActive.current = active;
    const since = heldSince.current === null ? -1 : now - heldSince.current;
    const holding = active && since >= 0;
    power.current = holding
      ? Math.min(1, power.current + delta * IGNITE_RATE)
      : Math.max(0, power.current - delta * MELT_RATE);
    const strength = power.current;

    for (const [material, speed] of [
      [materials.mist, 1],
      [materials.gale, 1.4],
    ] as const) {
      material.uniforms.uTime.value += delta * speed;
      material.uniforms.uPower.value = strength;
    }

    // The crystals burst out of his chest to their orbits, circle him tumbling and bobbing, and drop
    // and shrink away as it melts.
    crystals.forEach((crystal, index) => {
      const mesh = crystalMeshes.current[index];
      const sprite = glintSprites.current[index];
      if (!mesh || !sprite) return;
      const out = holding ? easeOut(clamp01((since - index * BURST_STAGGER) / BURST_SECONDS)) : 1;
      const angle = crystal.angle + now * crystal.speed;
      const radius = crystal.radius * out;
      const orbitY = crystal.height + Math.sin(angle) * crystal.radius * crystal.tilt;
      const y = CHEST + (orbitY - CHEST) * out + Math.sin(now * 1.3 + crystal.bob) * 0.04 - (1 - strength) * 0.4;
      const size = crystal.size * Math.min(1, out * 1.5) * (0.4 + 0.6 * strength);
      // Never drawn at (near) zero scale: its normal matrix would turn to NaN and the bloom would
      // smear that over the whole screen, blacking it out.
      const visible = strength > 0.01 && size > 0.005;
      mesh.visible = visible;
      mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      mesh.rotation.set(now * crystal.tumble[0], now * crystal.tumble[1], now * crystal.tumble[2]);
      mesh.scale.setScalar(Math.max(size, 0.005));

      // Now and then one catches the light.
      const twinkle = Math.max(0, Math.sin(now * crystal.glint + index * 2.3)) ** 24;
      sprite.visible = visible && twinkle > 0.02;
      sprite.position.copy(mesh.position);
      sprite.scale.setScalar(0.08 + twinkle * 0.22);
      glintMaterials[index].setValues({ opacity: strength * twinkle * 0.8 });
    });
    materials.crystal.setValues({ opacity: Math.min(1, strength * 1.4) });

    // Snow swirling up round him, fading in at his feet and out above his head.
    const positions = flakes.geometry.getAttribute("position") as BufferAttribute;
    const colors = flakes.geometry.getAttribute("color") as BufferAttribute;
    flakes.swirl.forEach((flake, index) => {
      const rise = (now / FLAKE_RISE_SECONDS + flake.phase) % 1;
      const angle = flake.angle + now * flake.spin;
      const radius = flake.radius * (1 - rise * 0.35);
      positions.setXYZ(index, Math.cos(angle) * radius, rise * HEIGHT, Math.sin(angle) * radius);
      const glow = Math.sin(rise * Math.PI) * strength * 0.7;
      colors.setXYZ(index, glow * 0.85, glow * 0.95, glow);
    });
    positions.needsUpdate = true;
    colors.needsUpdate = true;

    if (frost.current) {
      frost.current.visible = strength > 0.01;
      const spread = holding ? easeOut(clamp01(since / 0.4)) : 1;
      frost.current.scale.setScalar(FROST_RADIUS * (0.3 + 0.7 * spread));
    }
    materials.frost.setValues({
      opacity: 0.22 * strength * (0.85 + 0.15 * Math.sin(now * 1.7)),
    });

    const run = holding ? clamp01(since / WAVE_SECONDS) : 1;
    if (wave.current) {
      wave.current.visible = run < 1;
      wave.current.scale.setScalar(0.3 + easeOut(run) * WAVE_RADIUS);
    }
    materials.wave.setValues({ opacity: 0.5 * (1 - run) });
    const burst = holding ? clamp01(since / FLASH_SECONDS) : 1;
    if (flash.current) {
      flash.current.visible = burst < 1;
      flash.current.scale.setScalar(0.8 + burst * 1.6);
    }
    materials.flash.setValues({ opacity: 0.5 * (1 - burst) });
  });

  return (
    <group>
      <mesh position-y={HEIGHT / 2} material={materials.mist} renderOrder={2}>
        <cylinderGeometry args={[0.45, 0.6, HEIGHT, 48, 1, true]} />
      </mesh>
      <mesh position-y={HEIGHT * 0.45} material={materials.gale} renderOrder={2}>
        <cylinderGeometry args={[0.6, 0.8, HEIGHT * 0.9, 48, 1, true]} />
      </mesh>
      <points geometry={flakes.geometry} material={materials.snow} frustumCulled={false} renderOrder={2} />
      <mesh ref={frost} material={materials.frost} rotation-x={-Math.PI / 2} position-y={0.03} renderOrder={1}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      <mesh ref={wave} material={materials.wave} rotation-x={-Math.PI / 2} position-y={0.04} renderOrder={1}>
        <ringGeometry args={[0.9, 1, 64]} />
      </mesh>
      <sprite ref={flash} material={materials.flash} position-y={CHEST} visible={false} />
      {crystals.map(({ geometry }, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            crystalMeshes.current[index] = mesh;
          }}
          geometry={geometry}
          material={materials.crystal}
          visible={false}
        />
      ))}
      {glintMaterials.map((material, index) => (
        <sprite
          key={index}
          ref={(sprite) => {
            glintSprites.current[index] = sprite;
          }}
          material={material}
          visible={false}
        />
      ))}
    </group>
  );
}
