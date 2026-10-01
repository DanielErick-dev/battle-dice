"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, DoubleSide, Vector3, type Group, type MeshBasicMaterial } from "three";
import { jag, noise, stripsGeometry, writeStrip } from "./boltStrips";

/** Arcs crawling over the field, each this many straight runs, and how far round the dome one reaches (radians). */
const ARCS = 14;
const ARC_SEGMENTS = 8;
const ARC_SPAN_MIN = 0.5;
const ARC_SPAN_MAX = 1.2;
/** The field's dome, as shares of the figure's height: its radius around and its half-height. */
const DOME_RADIUS = 0.34;
const DOME_HALF_HEIGHT = 0.52;
/** Crackling rings on the ground at the figure's feet, as shares of its height. */
const RINGS = 2;
const RING_POINTS = 28;
const RING_RADIUS = 0.3;
const RING_JITTER = 0.05;
/** Half-widths of the glow and the white-hot core, as shares of the figure's height. */
const GLOW_WIDTH = 0.009;
const CORE_WIDTH = 0.0028;
/** Times per second the field jumps to a new shape, and the share of arcs that skip a flicker. */
const FLICKER_RATE = 20;
const SKIP_CHANCE = 0.35;
/** Per second: how fast the field charges up and dies down. */
const FADE_RATE = 4;

const ARC_POINTS = ARC_SEGMENTS + 1;
/** Every strip holds as many points as the longest (a ring); shorter bolts repeat their last point. */
const STRIP_POINTS = RING_POINTS + 1;
const STRIPS = ARCS + RINGS;

/** Working vectors for the frame loop (frames run one at a time, so instances can share them). */
const scratch = { centre: new Vector3(), axis: new Vector3(), from: new Vector3() };
const points = Array.from({ length: STRIP_POINTS }, () => new Vector3());

/**
 * A field of electricity around the figure while its power gathers (Dormant Fury waiting for the
 * roll): arcs crawl and snap over a dome around it, re-forming many times a second, and rings of
 * lightning crackle on the ground at its feet. Charges up while `active` and dies down after.
 * Mounted in the token's frame (the figure stands at its origin), `size` the figure's height.
 */
export function ElectricField({ active, color, size }: { active: boolean; color: string; size: number }) {
  const root = useRef<Group>(null);
  const glowMaterial = useRef<MeshBasicMaterial>(null);
  const coreMaterial = useRef<MeshBasicMaterial>(null);
  const glow = useMemo(() => new Color(color).multiplyScalar(1.5), [color]);
  const { glowGeometry, coreGeometry } = useMemo(
    () => ({ glowGeometry: stripsGeometry(STRIPS, STRIP_POINTS), coreGeometry: stripsGeometry(STRIPS, STRIP_POINTS) }),
    [],
  );
  useEffect(
    () => () => [glowGeometry, coreGeometry].forEach((geometry) => geometry.dispose()),
    [glowGeometry, coreGeometry],
  );
  const power = useRef(0);
  const shape = useRef<{ seeds: (number | null)[]; at: number }>({ seeds: [], at: -1 });

  useFrame(({ clock, camera }, delta) => {
    const group = root.current;
    if (!group) return;
    power.current += ((active ? 1 : 0) - power.current) * Math.min(1, delta * FADE_RATE);
    group.visible = power.current > 0.01;
    if (!group.visible) return;

    const t = clock.elapsedTime;
    if (t - shape.current.at > 1 / FLICKER_RATE) {
      shape.current = {
        seeds: Array.from({ length: STRIPS }, () => (Math.random() < SKIP_CHANCE ? null : Math.random() * 1000)),
        at: t,
      };
    }
    const { seeds } = shape.current;
    group.getWorldPosition(scratch.centre);
    const floorY = scratch.centre.y;
    scratch.centre.y += DOME_HALF_HEIGHT * size;
    const draw = (strip: number, width: number, closed = false) => {
      writeStrip(glowGeometry, strip, points, width * GLOW_WIDTH * size, camera.position, group, closed);
      writeStrip(coreGeometry, strip, points, width * CORE_WIDTH * size, camera.position, group, closed);
    };

    // Arcs over the dome: from a random spot, round it a little way about a random axis.
    for (let arc = 0; arc < ARCS; arc++) {
      const seed = seeds[arc];
      if (seed === null || seed === undefined) {
        draw(arc, 0);
        continue;
      }
      scratch.from.set(noise(seed) - 0.5, noise(seed + 1) - 0.5, noise(seed + 2) - 0.5).normalize();
      scratch.axis.set(noise(seed + 3) - 0.5, noise(seed + 4) - 0.5, noise(seed + 5) - 0.5);
      scratch.axis.cross(scratch.from).normalize();
      const span = ARC_SPAN_MIN + (ARC_SPAN_MAX - ARC_SPAN_MIN) * noise(seed + 6);
      points.forEach((point, k) => {
        const step = Math.min(k, ARC_SEGMENTS) / ARC_SEGMENTS;
        point.copy(scratch.from).applyAxisAngle(scratch.axis, span * step);
        point.set(point.x * DOME_RADIUS * size, point.y * DOME_HALF_HEIGHT * size, point.z * DOME_RADIUS * size);
        point.add(scratch.centre);
      });
      jag(points.slice(0, ARC_POINTS), seed + 7, size);
      draw(arc, power.current);
    }

    // Rings on the ground, each its own jagged loop round the feet.
    for (let ring = 0; ring < RINGS; ring++) {
      const strip = ARCS + ring;
      const seed = seeds[strip] ?? shape.current.at * 31 + ring;
      const radius = RING_RADIUS * size * (1 + ring * 0.35);
      points.forEach((point, k) => {
        const angle = (k / RING_POINTS) * Math.PI * 2 + ring;
        const wobble = k === RING_POINTS ? 0 : (noise(seed + k * 2.3) - 0.5) * 2 * RING_JITTER * size;
        point.set(
          scratch.centre.x + Math.cos(angle) * (radius + wobble),
          floorY + 0.03,
          scratch.centre.z + Math.sin(angle) * (radius + wobble),
        );
      });
      points[RING_POINTS].copy(points[0]);
      draw(strip, power.current * (ring === 0 ? 1 : 0.6), true);
    }

    // Flares as it charges, with a nervous flutter on top.
    if (glowMaterial.current) glowMaterial.current.opacity = 0.75 + Math.sin(t * 31) * 0.15;
    if (coreMaterial.current) coreMaterial.current.opacity = 1;
  });

  return (
    <group ref={root} visible={false}>
      <mesh geometry={glowGeometry} frustumCulled={false}>
        <meshBasicMaterial
          ref={glowMaterial}
          color={glow}
          side={DoubleSide}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={coreGeometry} frustumCulled={false}>
        <meshBasicMaterial
          ref={coreMaterial}
          color="#fffbe6"
          side={DoubleSide}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
