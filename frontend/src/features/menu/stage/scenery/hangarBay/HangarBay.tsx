"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import { Reticle } from "./Reticle";
import { PowerUp } from "./PowerUp";
import { PowerSurge } from "./PowerSurge";
import type { SceneryProps } from "../types";
import { preloadProps, useFittedProp } from "../kit/matchAssets";
import { driveEnergy, energize } from "@/features/shared/three/energize";

preloadProps([
  "hangarPad",
  "hangarCable",
  "hangarReactor",
  "hangarGenerator",
  "hangarCapsule",
  "hangarRack",
  "hangarCore",
  "hangarDrone",
]);

/** The Meshy landing pad, flattened into a thin disc the whole bay stands on. */
const PAD = { diameter: 3.1, thickness: 0.05 };
/** Its texture is near black: brightened so the machines read as standing on it. */
const PAD_BRIGHTNESS = 1.6;

/** Meshy machines round the back of the bay: where, how tall and which way each faces. */
type Machine = "hangarReactor" | "hangarGenerator" | "hangarCapsule" | "hangarRack" | "hangarCore";

const MACHINES: readonly { prop: Machine; x: number; z: number; height: number; turn: number }[] = [
  { prop: "hangarReactor", x: -0.95, z: -0.72, height: 1.15, turn: 0.55 },
  { prop: "hangarGenerator", x: 0.92, z: -0.68, height: 0.5, turn: -0.65 },
  { prop: "hangarCapsule", x: -0.34, z: -1.05, height: 0.72, turn: 0.15 },
  { prop: "hangarRack", x: 0.34, z: -1.05, height: 0.72, turn: -0.15 },
  { prop: "hangarCore", x: -1.08, z: 0.08, height: 0.34, turn: 1.1 },
];

/** The Meshy power cables: flange tucked a little into a machine (`from`), clamp on her calf (`to`, where her idle keeps it). */
/** Every cable is as thick and tall as this, its length stretched to reach from `from` to `to`. */
const CABLE_HEIGHT = 0.37;
const CABLES = [
  { from: [-0.74, -0.52], to: [-0.17, -0.05] },
  { from: [0.95, -0.7], to: [0.12, -0.08] },
] as const;

/** How hard each part glows once powered (its own colours lit up), and how much more in the surge. */
const GLOW = { pad: 0.35, machine: 0.25, cable: 0.3 };
const SURGE_BOOST = 1.5;
/** Seconds the surge takes to settle after the power first comes on. */
const SURGE_SECONDS = 3;
const ENERGY = "#5fd8ff";

/** The sentinel drone hovering over the bay's right side. */
const DRONE = { x: 0.88, y: 1.05, z: -0.3, height: 0.36 };

/** Unidade Alva's stage in place of the rune pedestal; origin on the floor. */
export function HangarBay({ intro, setLights, introSeconds }: SceneryProps) {
  const pad = useFittedProp("hangarPad");
  const machines: Record<Machine, ReturnType<typeof useFittedProp>> = {
    hangarReactor: useFittedProp("hangarReactor"),
    hangarGenerator: useFittedProp("hangarGenerator"),
    hangarCapsule: useFittedProp("hangarCapsule"),
    hangarRack: useFittedProp("hangarRack"),
    hangarCore: useFittedProp("hangarCore"),
  };
  const drone = useFittedProp("hangarDrone");
  const cable = useFittedProp("hangarCable");
  const { hangarReactor, hangarGenerator, hangarCapsule, hangarRack, hangarCore } = machines;
  // Their own copies, so the power can flow over them without touching anyone else's.
  const energized = useMemo(() => {
    const padEnergy = energize(pad.material, ENERGY, GLOW.pad, "ripple");
    padEnergy.material.color.multiplyScalar(PAD_BRIGHTNESS);
    return {
      pad: padEnergy,
      cable: energize(cable.material, ENERGY, GLOW.cable),
      hangarReactor: energize(hangarReactor.material, ENERGY, GLOW.machine),
      hangarGenerator: energize(hangarGenerator.material, ENERGY, GLOW.machine),
      hangarCapsule: energize(hangarCapsule.material, ENERGY, GLOW.machine),
      hangarRack: energize(hangarRack.material, ENERGY, GLOW.machine),
      hangarCore: energize(hangarCore.material, ENERGY, GLOW.machine),
    };
  }, [
    pad.material,
    cable.material,
    hangarReactor.material,
    hangarGenerator.material,
    hangarCapsule.material,
    hangarRack.material,
    hangarCore.material,
  ]);
  useEffect(() => () => Object.values(energized).forEach(({ material }) => material.dispose()), [energized]);
  const padScale = PAD.diameter / Math.max(pad.size[0], pad.size[2]);
  /** 0 while she is switched off, 1 once powered up (see PowerUp). */
  const power = useRef(0);
  const onPower = useCallback((level: number) => void (power.current = level), []);
  const hover = useRef<Group>(null);
  /** When the power last came on, for the surge. */
  const poweredAt = useRef<number | null>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (power.current === 0) poweredAt.current = null;
    else poweredAt.current ??= t;
    const surge = poweredAt.current === null ? 0 : Math.max(0, 1 - (t - poweredAt.current) / SURGE_SECONDS);
    const boost = SURGE_BOOST * surge * (0.75 + 0.25 * Math.sin(t * 9));
    Object.values(energized).forEach((energy) => driveEnergy(energy, t, power.current, boost));
    if (hover.current) {
      hover.current.position.y = DRONE.y + Math.sin(t * 1.3) * 0.05;
      hover.current.rotation.y = -0.6 + Math.sin(t * 0.4) * 0.35;
    }
  });

  return (
    <group>
      {/* Its top just above the floor the figure stands on. */}
      <mesh
        geometry={pad.geometry}
        material={energized.pad.material}
        position-y={-PAD.thickness + 0.004}
        scale={[padScale, PAD.thickness, padScale]}
        receiveShadow
      />
      <Reticle />
      <PowerUp key={intro} setLights={setLights} introSeconds={introSeconds} onPower={onPower} />
      <PowerSurge key={`surge:${intro}`} introSeconds={introSeconds} />
      {CABLES.map(({ from, to }, index) => {
        const [x0, z0] = from;
        const [x1, z1] = to;
        const length = Math.hypot(x1 - x0, z1 - z0);
        return (
          <mesh
            key={index}
            geometry={cable.geometry}
            material={energized.cable.material}
            position={[(x0 + x1) / 2, 0, (z0 + z1) / 2]}
            // Its length runs along +Z, flange to clamp.
            rotation-y={Math.atan2(x1 - x0, z1 - z0)}
            scale={[CABLE_HEIGHT, CABLE_HEIGHT, length / cable.size[2]]}
            castShadow
          />
        );
      })}
      {MACHINES.map(({ prop, x, z, height, turn }) => (
        <mesh
          key={prop}
          geometry={machines[prop].geometry}
          material={energized[prop].material}
          position={[x, 0, z]}
          rotation-y={turn}
          scale={height}
          castShadow
        />
      ))}
      <group ref={hover} position={[DRONE.x, DRONE.y, DRONE.z]}>
        <mesh geometry={drone.geometry} material={drone.material} position-y={-DRONE.height / 2} scale={DRONE.height} />
      </group>
    </group>
  );
}
