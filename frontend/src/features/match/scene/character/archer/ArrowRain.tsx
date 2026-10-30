"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  CylinderGeometry,
  DoubleSide,
  MeshBasicMaterial,
  type BufferGeometry,
  type MeshStandardMaterial,
  type Group,
  type Mesh,
} from "three";
import { seededRandom } from "@/game/domain/random";
import { DEFAULT_TIMINGS } from "../../../config";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../../boardLayout";
import { useAge } from "../../useAge";
import { CHEST_HEIGHT } from "../core/figure";
import { fadingMaterial, preloadProps, PROP_HEIGHT, usePropMesh } from "../core/props";

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
export const ARROW_LENGTH = 1.25;
/** The streak trailing a falling arrow, as long as this share of the fall. */
const TRAIL_LENGTH = 2.6;

const TILE_TOP = TILE_HEIGHT / 2;

/** How far the colour is pushed past 1, so the arrows of light bloom. */
const glowOf = (color: string, strength: number) => new Color(color).multiplyScalar(strength);

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
  const sights = useRef<(Group | null)[]>([]);
  const glow = useMemo(() => glowOf(color, 2.6), [color]);
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
      const eased = 1 - (1 - progress) ** 2;
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
      sight.scale.setScalar(1.6 - 0.6 * (1 - (1 - lock) ** 3));
      sight.rotation.y = t * SIGHT_SPIN;
    });
    sightMaterial.setValues({ opacity: Math.min(1, t * 3) * (0.55 + 0.35 * Math.sin(t * 18)) });

    targets.forEach((_, targetIndex) => {
      const since = t - firstHit;
      const flash = flashes.current[targetIndex];
      if (flash) flash.opacity = since < 0 ? 0 : 0.95 * Math.max(0, 1 - since / (FLASH_SECONDS + FALL_STAGGER));
      const wave = waves.current[targetIndex];
      if (wave) {
        const spread = Math.min(1, Math.max(0, since / SHOCKWAVE_SECONDS));
        wave.visible = since >= 0 && spread < 1;
        wave.scale.setScalar(0.3 + (1 - (1 - spread) ** 3) * 1.6);
        (wave.material as MeshBasicMaterial).opacity = 0.9 * (1 - spread);
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
            <meshBasicMaterial
              ref={(material) => {
                flashes.current[index] = material;
              }}
              color={glow}
              transparent
              opacity={0}
              depthWrite={false}
              blending={AdditiveBlending}
              toneMapped={false}
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
            <meshBasicMaterial
              color={glow}
              transparent
              opacity={0}
              depthWrite={false}
              blending={AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A target's sights on the tile: a ring with four ticks pointing in, lying flat. */
function Sight({ material }: { material: MeshBasicMaterial }) {
  return (
    <group rotation-x={-Math.PI / 2}>
      <mesh material={material}>
        <ringGeometry args={[TILE_SIZE * 0.42, TILE_SIZE * 0.47, 48]} />
      </mesh>
      {[0, 1, 2, 3].map((quarter) => (
        <mesh
          key={quarter}
          material={material}
          rotation-z={(quarter * Math.PI) / 2}
          position={[
            Math.cos((quarter * Math.PI) / 2) * TILE_SIZE * 0.36,
            Math.sin((quarter * Math.PI) / 2) * TILE_SIZE * 0.36,
            0,
          ]}
        >
          <planeGeometry args={[TILE_SIZE * 0.16, 0.06]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * An additive, bloom-bright material for arrows of light; faded with `setValues({ opacity })`.
 * With `vertexColors`, the geometry's colours shade it (black: nothing shows).
 */
export function useGlowMaterial(glow: Color, vertexColors = false): MeshBasicMaterial {
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: glow,
        vertexColors,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        side: DoubleSide,
      }),
    [glow, vertexColors],
  );
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

export interface ArrowMaterials {
  /** The elven arrow's mesh (see PROPS.elvenArrow). */
  geometry: BufferGeometry;
  /** Its own textured material, its green flames glowing a little, faded with the rest. */
  solid: MeshStandardMaterial;
  /** A faint sheath of light in the flight's colour round the shaft. */
  glow: MeshBasicMaterial;
  fade: (opacity: number) => void;
}

preloadProps(["elvenArrow"]);

/** The materials of a flight of elven arrows, faded together. */
export function useArrowMaterials(glow: Color): ArrowMaterials {
  const sheath = useGlowMaterial(glow);
  const { geometry, material } = usePropMesh("elvenArrow");
  const solid = useMemo(() => {
    const copy = fadingMaterial(material);
    copy.depthWrite = false;
    copy.emissive = new Color("#ffffff");
    copy.emissiveMap = copy.map;
    copy.emissiveIntensity = 0.45;
    return copy;
  }, [material]);
  useEffect(() => () => solid.dispose(), [solid]);
  return useMemo(
    () => ({
      geometry,
      solid,
      glow: sheath,
      fade: (opacity: number) => {
        sheath.setValues({ opacity: opacity * 0.25 });
        solid.setValues({ opacity });
      },
    }),
    [geometry, solid, sheath],
  );
}

/**
 * One elven arrow (green flames curling round its gilded shaft) pointing up its local +Y,
 * ARROW_LENGTH long and centred on its middle, in a faint sheath of light. The arrows of one
 * flight share their materials, so fading them fades them all.
 */
export function LightArrow({ materials }: { materials: ArrowMaterials }) {
  return (
    <group>
      <mesh geometry={materials.geometry} material={materials.solid} scale={ARROW_LENGTH / PROP_HEIGHT} />
      <mesh material={materials.glow}>
        <cylinderGeometry args={[0.06, 0.06, ARROW_LENGTH, 6]} />
      </mesh>
    </group>
  );
}

/** Arrows left stuck in a pinned tile: where they sit on it and how they slant. */
const PINNING_ARROWS = [
  { x: -0.42, z: -0.22, tilt: [0.22, -0.12] },
  { x: 0.38, z: -0.3, tilt: [-0.15, 0.2] },
  { x: 0.08, z: 0.4, tilt: [0.1, 0.24] },
  { x: -0.2, z: 0.12, tilt: [-0.08, -0.18] },
] as const;
const PIN_PULSE_RATE = 2.2;
/** The column of light rising from a pinned tile (fading out towards its top), and the rune ring's turning speed. */
const COLUMN_HEIGHT = 2.4;
const RUNE_TURN_RATE = 0.6;

/**
 * A trap Arrow Rain pinned down: four arrows of light stuck in the tile inside a double ring of
 * binding (the inner one broken into turning runes), under a faint column of light, fading upwards,
 * that marks it from across the board. It pulses until the archer walks past and frees it.
 */
export function PinnedTrapMark({ position, color }: { position: Vec3; color: string }) {
  const glow = useMemo(() => glowOf(color, 1.3), [color]);
  const arrows = useArrowMaterials(glow);
  const ringMaterial = useGlowMaterial(glow);
  const columnMaterial = useGlowMaterial(
    useMemo(() => glowOf(color, 0.7), [color]),
    true,
  );
  const column = useMemo(() => fadingColumn(TILE_SIZE * 0.36, TILE_SIZE * 0.46, COLUMN_HEIGHT), []);
  useEffect(() => () => column.dispose(), [column]);
  const runes = useRef<Group>(null);
  const root = useRef<Group>(null);
  const age = useAge();

  useFrame(({ clock }, delta) => {
    const t = age(clock.elapsedTime);
    // Snaps in as the rain lands, then breathes.
    root.current?.scale.setScalar(Math.min(1, 0.6 + t * 4));
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * PIN_PULSE_RATE * Math.PI);
    ringMaterial.setValues({ opacity: 0.4 + 0.3 * pulse });
    columnMaterial.setValues({ opacity: 0.07 + 0.05 * pulse });
    arrows.fade(1);
    if (runes.current) runes.current.rotation.z += delta * RUNE_TURN_RATE;
  });

  return (
    <group ref={root} position={[position[0], position[1] + TILE_TOP, position[2]]}>
      {PINNING_ARROWS.map(({ x, z, tilt }, index) => (
        // Heads up and out of the stone, the fletching end driven into it.
        <group key={index} position={[x, ARROW_LENGTH * 0.32, z]} rotation={[tilt[0], 0, tilt[1]]}>
          <LightArrow materials={arrows} />
        </group>
      ))}
      <group rotation-x={-Math.PI / 2} position-y={0.035}>
        <mesh material={ringMaterial}>
          <ringGeometry args={[TILE_SIZE * 0.4, TILE_SIZE * 0.46, 48]} />
        </mesh>
        <group ref={runes}>
          {Array.from({ length: 8 }, (_, index) => (
            <mesh key={index} material={ringMaterial}>
              <ringGeometry args={[TILE_SIZE * 0.28, TILE_SIZE * 0.33, 6, 1, (index * Math.PI) / 4, Math.PI / 6]} />
            </mesh>
          ))}
        </group>
      </group>
      <mesh position-y={COLUMN_HEIGHT / 2} geometry={column} material={columnMaterial} />
    </group>
  );
}

/**
 * An open cylinder whose vertex colours go from white at the bottom to black at the top: under an
 * additive material, light that thins out as it rises instead of ending in a hard rim.
 */
function fadingColumn(top: number, bottom: number, height: number): CylinderGeometry {
  const geometry = new CylinderGeometry(top, bottom, height, 32, 6, true);
  const heights = geometry.getAttribute("position");
  const colors = new Float32Array(heights.count * 3);
  for (let index = 0; index < heights.count; index++) {
    const shade = (1 - (heights.getY(index) + height / 2) / height) ** 2;
    colors.set([shade, shade, shade], index * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  return geometry;
}
