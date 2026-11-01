"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3, type Group } from "three";
import type { Vec3 } from "../../boardLayout";
import { fadingMaterial, preloadProps, Prop, usePropMesh } from "../core/props";
import { useDisposable } from "../shared/disposal";
import { VOID_BLACK } from "./voidPalette";
import { SURGE_SECONDS } from "./VoidSurge";

/** Seconds a wander leg lasts, and of each cycle the Void shows for (it only now and then comes out). */
const WANDER_SECONDS = 6;
const CYCLE_SECONDS = 26;
const SHOWN_SECONDS = 11;
/** The wraith's height in world units (a figure stands about 1.9), and how high its tail drifts off the ground. */
const WRAITH_HEIGHT = 2.6;
const TAIL_CLEARANCE = 0.25;
/** How much of its texture's colour is kept. */
const WRAITH_SHADE = 0.18;

preloadProps(["voidWraith"]);

interface VoidWraithProps {
  /** Tiles it drifts between. */
  roam: readonly Vec3[];
  /** Zarek's latest call: a fresh id sends it rushing to `at` for as long as the rift takes. */
  call: { id: number; at: Vec3 } | null;
}

/**
 * The Void itself, a wraith of black smoke (PROPS.voidWraith) drifting low over the board: now and
 * then it comes out to roam, and whenever Zarek calls on it, it rushes to the tile and stays till
 * done. Not rigged: it bobs, leans into its drift and breathes in code.
 */
export function VoidWraith({ roam, call }: VoidWraithProps) {
  const { geometry, material } = usePropMesh("voidWraith");
  // Its texture reads grey under the moon: darkened to black smoke, with no glow: the Void is pure black.
  const shade = useMemo(() => {
    const black = fadingMaterial(material, WRAITH_SHADE);
    black.emissiveIntensity = 0;
    black.metalness = 0;
    black.roughness = 1;
    return black;
  }, [material]);
  useDisposable(shade);
  const body = useRef<Group>(null);
  const answered = useRef<{ id: number; at: number } | null>(null);
  const at = useMemo(() => new Vector3(), []);
  const placed = useRef(false);
  const goal = useMemo(() => new Vector3(), []);
  const shown = useRef(0);
  const leg = useRef(-1);
  const heading = useRef(0);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    if (!placed.current && roam[0]) {
      at.set(...roam[0]);
      placed.current = true;
    }
    if (call && call.id !== answered.current?.id) answered.current = { id: call.id, at: time };
    const summoned = call && answered.current && time - answered.current.at < SURGE_SECONDS + 0.4 ? call.at : null;
    const legIndex = Math.floor(time / WANDER_SECONDS);
    if (!summoned && legIndex !== leg.current && roam.length > 0) {
      leg.current = legIndex;
      // A pseudo-random tile each leg, the same for every client at the same time.
      const pick = roam[Math.floor(Math.abs(Math.sin(legIndex * 12.9898) * 43758.5453) % roam.length)];
      goal.set(pick[0], pick[1], pick[2]);
    }
    if (summoned) goal.set(summoned[0], summoned[1], summoned[2]);
    const dx = goal.x - at.x;
    const dz = goal.z - at.z;
    at.lerp(goal, Math.min(1, delta * (summoned ? 4 : 0.35)));

    const phase = time % CYCLE_SECONDS;
    const roaming = phase < SHOWN_SECONDS ? Math.min(1, phase / 2, (SHOWN_SECONDS - phase) / 2) : 0;
    const target = summoned ? 1 : roaming;
    shown.current += (target - shown.current) * Math.min(1, delta * 3);
    shade.setValues({ opacity: shown.current });

    const node = body.current;
    if (!node) return;
    node.visible = shown.current > 0.02;
    // Faces where it drifts, leaning into it; the smoke breathes and sways as it goes.
    const travel = Math.hypot(dx, dz);
    if (travel > 0.05) heading.current += (Math.atan2(dx, dz) - heading.current) * Math.min(1, delta * 2);
    node.position.set(at.x, at.y + TAIL_CLEARANCE + WRAITH_HEIGHT / 2 + Math.sin(time * 1.3) * 0.12, at.z);
    node.rotation.set(Math.min(0.25, travel * 0.04), heading.current, Math.sin(time * 0.9) * 0.06, "YXZ");
    const breath = 1 + Math.sin(time * 2.1) * 0.03;
    node.scale.set(breath, 1 / breath, breath);
  });

  return (
    <group ref={body}>
      <Prop geometry={geometry} material={shade} height={WRAITH_HEIGHT} />
      <Sparkles count={24} scale={[1.8, 2.6, 1.8]} position-y={-0.4} size={3} speed={0.6} color={VOID_BLACK} />
    </group>
  );
}
