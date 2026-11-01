"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh, MeshBasicMaterial } from "three";
import { seededRandom } from "@/game/domain/random";
import { DEFAULT_TIMINGS } from "../../../config";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../../boardLayout";
import { useAge } from "../../useAge";
import { CHEST_HEIGHT } from "../core/figure";
import { AdditiveMaterial, useGlowMaterial } from "../shared/additive";
import { clamp01, easeOutCubic, easeOutQuad } from "../shared/easing";
import { useGlowColor } from "../shared/glowColor";
import { ARROW_LENGTH, LightArrow, useArrowMaterials } from "./lightArrow";
import { Sight } from "./Sight";

/** Arrows shot up into the sky, and how long each takes to vanish up there. */
const RISING_ARROWS = 16;
const RISE_SECONDS = 0.55;
const RISE_STAGGER = 0.035;
const RISE_HEIGHT = 15;
/** Arrows falling on each target, from how high, and how long each takes to hit. */
const ARROWS_PER_TARGET = 10;
const FALL_HEIGHT = 13;
const FALL_SECONDS = 0.3;
const FALL_STAGGER = 0.3;
/** The rain starts falling this long before the playback lands it (DEFAULT_TIMINGS.arrowVolleyMs). */
const FALL_STARTS = DEFAULT_TIMINGS.arrowVolleyMs / 1000 - FALL_SECONDS - FALL_STAGGER;
/** How long the arrows stay stuck in the ground, fading, once the rain is over. */
const STUCK_SECONDS = 2.6;
const FLASH_SECONDS = 0.5;
const SHOCKWAVE_SECONDS = 0.6;
/** The sights marking each target, from the moment the arrows leave until they land. */
const SIGHT_SPIN = 2.2;
/** Arrows lean a little as they fall, as if blown from the archer's side. */
const FALL_LEAN = 0.18;
/** The streak trailing a falling arrow, as long as this share of the fall. */
const TRAIL_LENGTH = 2.6;

const TILE_TOP = TILE_HEIGHT / 2;

/**
 * Arrow Rain, in world space: a sheaf of arrows of light leaves the archer straight up into the
 * sky while sights lock onto every target tile (an opponent, or a trap ahead to pin down); then
 * the rain falls on them, streaking, each hit flashing on the stone with a shockwave. Timed like
 * the playback (DEFAULT_TIMINGS.arrowVolleyMs); mounted with a fresh key per volley, it fades
 * itself out. No lights: bloom does the glow.
 */
export function ArrowVolley({ from, targets, color }: { from: Vec3; targets: readonly Vec3[]; color: string }) {
  const rising = useRef<(Group | null)[]>([]);
  const falling = useRef<(Group | null)[]>([]);
  const trails = useRef<(Mesh | null)[]>([]);
  const flashes = useRef<(MeshBasicMaterial | null)[]>([]);
  const waves = useRef<(Mesh | null)[]>([]);
  const waveMaterials = useRef<(MeshBasicMaterial | null)[]>([]);
  const sights = useRef<(Group | null)[]>([]);
  const glow = useGlowColor(color, 2.6);
  const rise = useArrowMaterials(glow);
  const fall = useArrowMaterials(glow);
  const trailMaterial = useGlowMaterial(glow);
  const sightMaterial = useGlowMaterial(glow);
  const age = useAge();

  const sheaf = useMemo(() => {
    const random = seededRandom(from[0] * 97 + from[2] * 13);
    return Array.from({ length: RISING_ARROWS }, (_, i) => ({
      at: i * RISE_STAGGER,
      x: (random() - 0.5) * 0.5,
      z: (random() - 0.5) * 0.5,
      drift: [(random() - 0.5) * 2.4, (random() - 0.5) * 2.4] as const,
    }));
  }, [from]);

  const rain = useMemo(() => {
    const random = seededRandom(targets.length * 31 + from[0]);
    return targets.flatMap((target, targetIndex) =>
      Array.from({ length: ARROWS_PER_TARGET }, (_, i) => {
        const angle = random() * Math.PI * 2;
        const radius = i === 0 ? 0 : TILE_SIZE * (0.1 + random() * 0.3);
        return {
          target: targetIndex,
          at: FALL_STARTS + (i === 0 ? 0 : random() * FALL_STAGGER),
          x: target[0] + Math.cos(angle) * radius,
          z: target[2] + Math.sin(angle) * radius,
          ground: target[1] + TILE_TOP,
          // Sunk a little way into the stone, at a slight slant.
          tilt: [(random() - 0.5) * FALL_LEAN * 2, (random() - 0.5) * FALL_LEAN * 2] as const,
        };
      }),
    );
  }, [targets, from]);

  const done = FALL_STARTS + FALL_STAGGER + FALL_SECONDS + STUCK_SECONDS;
  const firstHit = FALL_STARTS + FALL_SECONDS;

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime);

    sheaf.forEach((arrow, index) => {
      const group = rising.current[index];
      if (!group) return;
      const progress = (t - arrow.at) / RISE_SECONDS;
      group.visible = progress > 0 && progress < 1;
      if (!group.visible) return;
      // Fast off the string, easing as it climbs out of sight.
      const eased = easeOutQuad(progress);
      group.position.set(
        from[0] + arrow.x + arrow.drift[0] * eased,
        from[1] + TILE_TOP + CHEST_HEIGHT + RISE_HEIGHT * eased,
        from[2] + arrow.z + arrow.drift[1] * eased,
      );
    });
    rise.fade(Math.max(0, 1 - Math.max(0, t - RISE_SECONDS * 0.5) / RISE_SECONDS));

    rain.forEach((arrow, index) => {
      const group = falling.current[index];
      if (!group) return;
      const progress = (t - arrow.at) / FALL_SECONDS;
      group.visible = progress > 0 && t < done;
      if (!group.visible) return;
      // Gathers speed as it falls; once down, it stays stuck, tip buried in the stone.
      const drop = Math.min(1, progress) ** 2;
      const height = arrow.ground + ARROW_LENGTH * 0.35 + FALL_HEIGHT * (1 - drop);
      group.position.set(arrow.x, height, arrow.z);
      group.rotation.set(Math.PI + arrow.tilt[0], 0, arrow.tilt[1]);
      const trail = trails.current[index];
      if (trail) trail.visible = progress < 1;
    });
    const stuckFor = t - (FALL_STARTS + FALL_STAGGER + FALL_SECONDS);
    fall.fade(stuckFor < 0 ? 1 : Math.max(0, 1 - stuckFor / STUCK_SECONDS));
    trailMaterial.setValues({ opacity: 0.55 });

    // Sights close in on the targets as the arrows climb, and burn out as the rain lands.
    const lock = Math.min(1, t / FALL_STARTS);
    sights.current.forEach((sight) => {
      if (!sight) return;
      sight.visible = t < firstHit + 0.15;
      sight.scale.setScalar(1.6 - 0.6 * easeOutCubic(lock));
      sight.rotation.y = t * SIGHT_SPIN;
    });
    sightMaterial.setValues({ opacity: Math.min(1, t * 3) * (0.55 + 0.35 * Math.sin(t * 18)) });

    targets.forEach((_, targetIndex) => {
      const since = t - firstHit;
      const flash = flashes.current[targetIndex];
      if (flash) flash.opacity = since < 0 ? 0 : 0.95 * Math.max(0, 1 - since / (FLASH_SECONDS + FALL_STAGGER));
      const wave = waves.current[targetIndex];
      const waveMaterial = waveMaterials.current[targetIndex];
      if (wave && waveMaterial) {
        const spread = clamp01(since / SHOCKWAVE_SECONDS);
        wave.visible = since >= 0 && spread < 1;
        wave.scale.setScalar(0.3 + easeOutCubic(spread) * 1.6);
        waveMaterial.opacity = 0.9 * (1 - spread);
      }
    });
  });

  return (
    <group>
      {sheaf.map((_, index) => (
        <group
          key={`up${index}`}
          ref={(group) => {
            rising.current[index] = group;
          }}
          visible={false}
        >
          <LightArrow materials={rise} />
        </group>
      ))}
      {rain.map((_, index) => (
        <group
          key={`down${index}`}
          ref={(group) => {
            falling.current[index] = group;
          }}
          visible={false}
        >
          <LightArrow materials={fall} />
          {/* The streak it leaves behind, pointing back up the way it came. */}
          <mesh
            ref={(mesh) => {
              trails.current[index] = mesh;
            }}
            position-y={-ARROW_LENGTH / 2 - TRAIL_LENGTH / 2}
            rotation-x={Math.PI}
            material={trailMaterial}
          >
            <coneGeometry args={[0.05, TRAIL_LENGTH, 6, 1, true]} />
          </mesh>
        </group>
      ))}
      {targets.map((target, index) => (
        <group key={`target${index}`} position={[target[0], target[1] + TILE_TOP + 0.04, target[2]]}>
          <group
            ref={(group) => {
              sights.current[index] = group;
            }}
          >
            <Sight material={sightMaterial} />
          </group>
          <mesh rotation-x={-Math.PI / 2}>
            <circleGeometry args={[TILE_SIZE * 0.6, 32]} />
            <AdditiveMaterial
              ref={(material) => {
                flashes.current[index] = material;
              }}
              color={glow}
              opacity={0}
            />
          </mesh>
          <mesh
            ref={(mesh) => {
              waves.current[index] = mesh;
            }}
            rotation-x={-Math.PI / 2}
            visible={false}
          >
            <ringGeometry args={[TILE_SIZE * 0.5, TILE_SIZE * 0.58, 48]} />
            <AdditiveMaterial
              ref={(material) => {
                waveMaterials.current[index] = material;
              }}
              color={glow}
              opacity={0}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
