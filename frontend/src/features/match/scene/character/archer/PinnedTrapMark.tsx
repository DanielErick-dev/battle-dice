"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BufferAttribute, CylinderGeometry, type Group } from "three";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "../../boardLayout";
import { useAge } from "../../useAge";
import { useGlowMaterial } from "../shared/additive";
import { useDisposable } from "../shared/disposal";
import { useGlowColor } from "../shared/glowColor";
import { ARROW_LENGTH, LightArrow, useArrowMaterials } from "./lightArrow";

const TILE_TOP = TILE_HEIGHT / 2;

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
  const glow = useGlowColor(color, 1.3);
  const arrows = useArrowMaterials();
  const ringMaterial = useGlowMaterial(glow);
  const columnMaterial = useGlowMaterial(useGlowColor(color, 0.7), true);
  const column = useDisposable(useMemo(() => fadingColumn(TILE_SIZE * 0.36, TILE_SIZE * 0.46, COLUMN_HEIGHT), []));
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
