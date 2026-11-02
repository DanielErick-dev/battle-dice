"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, MeshBasicMaterial, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { useAge } from "../../useAge";
import { fadingMaterial, preloadProps, Prop, usePropMesh } from "../core/props";
import { useDisposables } from "../shared/disposal";
import { TIPPED, verdictFrame, verdictGlow } from "./verdictTimeline";

/** In the effects' units (a figure stands 1.9 tall): the pans hang over the heads of the two players. */
const PIVOT_Y = 3.8;
const ARM_MIN = 1.4;
const ARM_MAX = 3.2;
/** Players closer than this share the space under the column: the scale stands back from them. */
const CROWDED = 2.8;
const STAND_BACK = 1.8;

/**
 * The Meshy parts, measured in their export units (±1 on the longest side): the beam's bar sits at BAR_Y with its
 * ends at x ±1 and a needle hanging from its middle; a pan hangs from a hook at its top, its rim RIM_DROP below it.
 */
const BAR_Y = 0.55;
const RIM_DROP = 1.7;
const RIM_RADIUS = 0.72;
/** Thickness of the beam however long its arms are stretched. */
const BEAM_SCALE = 2.2;
const PAN_SCALE = 0.62 / RIM_RADIUS;
const CHAIN_LENGTH = RIM_DROP * PAN_SCALE;
/** The beam swings in front of the column, so its needle never cuts through it. */
const BEAM_FRONT = 0.45;

const JUDGEMENT = "#fcd34d";

preloadProps(["greekColumn", "scaleBeam", "scalePan"]);

/** The board's night would swallow the bronze: it glows faintly of its own so the verdict always reads. */
function lit(material: MeshStandardMaterial): MeshStandardMaterial {
  material.emissive.set("#6b5638");
  material.emissiveIntensity = 0.55;
  return material;
}

interface VerdictScaleProps {
  /** Distance to the attacker in the effects' units, who stands along +x. */
  span: number;
  phase: "weigh" | "tip";
}

/**
 * Themis's Silent Verdict: a giant bronze scale on a Greek column comes down between the judge (-x) and the
 * one judged (+x), weighs, swinging, then drops on their side and strikes them.
 */
export function VerdictScale({ span, phase }: VerdictScaleProps) {
  const age = useAge();
  const root = useRef<Group>(null);
  const beam = useRef<Group>(null);
  const pans = [useRef<Group>(null), useRef<Group>(null)];
  const strike = useRef<Mesh>(null);
  const tipAt = useRef<number | null>(null);

  const column = usePropMesh("greekColumn");
  const beamMesh = usePropMesh("scaleBeam");
  const panMesh = usePropMesh("scalePan");
  const crowded = span < CROWDED;
  const arm = Math.min(ARM_MAX, Math.max(ARM_MIN, span / 2));
  const materials = useMemo(
    () => ({
      column: lit(fadingMaterial(column.material)),
      beam: lit(fadingMaterial(beamMesh.material)),
      pan: lit(fadingMaterial(panMesh.material)),
      glow: new MeshBasicMaterial({
        color: JUDGEMENT,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    }),
    [column.material, beamMesh.material, panMesh.material],
  );
  useDisposables(materials);

  useFrame(({ clock }) => {
    const t = age(clock.elapsedTime);
    if (phase === "tip") tipAt.current ??= t;
    const frame = verdictFrame(t, tipAt.current);
    const { opacity, angle, struck } = frame;
    if (root.current) {
      root.current.visible = opacity > 0;
      root.current.position.y = frame.drop;
    }
    materials.column.opacity = materials.beam.opacity = materials.pan.opacity = opacity;

    beam.current?.rotation.set(0, 0, angle);
    pans.forEach((pan, side) => {
      const x = (side === 0 ? -arm : arm) * Math.cos(angle);
      const y = PIVOT_Y + (side === 0 ? -arm : arm) * Math.sin(angle) - CHAIN_LENGTH;
      pan.current?.position.set(x, y, BEAM_FRONT);
    });

    // Judgment strikes from the lowered pan down onto the attacker, a flash that fades.
    if (strike.current) {
      strike.current.visible = struck > 0 && opacity > 0;
      strike.current.scale.x = strike.current.scale.z = Math.max(0.05, 1 - struck * 1.2);
    }
    materials.glow.opacity = verdictGlow(frame);
  });

  const panY = PIVOT_Y + arm * Math.sin(TIPPED) - CHAIN_LENGTH;
  return (
    <group position={[0, 0, crowded ? -STAND_BACK : 0]}>
      <group ref={root}>
        <Prop geometry={column.geometry} material={materials.column} height={PIVOT_Y} standing />
        {/* A golden halo behind the pivot, the judge's light. */}
        <mesh material={materials.glow} position={[0, PIVOT_Y, BEAM_FRONT - 0.1]}>
          <torusGeometry args={[0.55, 0.03, 8, 40]} />
        </mesh>

        <group ref={beam} position={[0, PIVOT_Y, BEAM_FRONT]}>
          <mesh
            geometry={beamMesh.geometry}
            material={materials.beam}
            scale={[arm, BEAM_SCALE, BEAM_SCALE]}
            position-y={-BAR_Y * BEAM_SCALE}
          />
        </group>

        {pans.map((pan, side) => (
          <group key={side} ref={pan}>
            {/* Its hook right under the end of the beam, its rim at the group's origin. */}
            <mesh
              geometry={panMesh.geometry}
              material={materials.pan}
              scale={PAN_SCALE}
              position-y={CHAIN_LENGTH - PAN_SCALE}
            />
          </group>
        ))}

        <mesh
          ref={strike}
          material={materials.glow}
          position={[arm * Math.cos(TIPPED), panY / 2, BEAM_FRONT]}
          visible={false}
        >
          <cylinderGeometry args={[0.32, 0.5, panY, 16, 1, true]} />
        </mesh>
      </group>
    </group>
  );
}
