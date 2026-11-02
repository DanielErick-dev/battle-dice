"use client";

import { useMemo } from "react";
import { Color, SpriteMaterial } from "three";
import { useDisposal } from "../kit/dispose";
import { FlickerSprite } from "../kit/FlickerSprite";
import { usePropMesh, useSoftDisc } from "../kit/matchAssets";
import { GLOW, HOT_GLOW } from "../kit/materials";
import type { FlameShape, Flicker } from "../kit/motion";

/**
 * Meshy exports come out ±1 on their longest side; these are where each part's own surfaces sit, in those units.
 * The arena's floor lies lower than the low wall round its rim.
 */
const ARENA_FLOOR = -0.066;
const BASIN_MOUTH = 1;
const BASIN_RIM = 0.65;

/** The stone arena is her floor, centred under her, wide enough for the columns, the arch and the basin. */
const ARENA_RADIUS = 1.45;
/** Behind her at the back of the arena, kept in proportion: its sides pass behind the columns. Its model leans
 * left (legs at x -0.78 and +0.55), so it's nudged right to centre its opening on her. */
const ARCH = { x: 0.15, z: -1.12, height: 2.25 };
/** The offering basin in front of her, off to her left, its sacred fire burning gold. */
const BASIN = { x: 0.6, z: 0.35, height: 0.5 };

const FIRE = new Color("#ffc55a").multiplyScalar(2.6);
const FIRE_FLICKER: Flicker = { slow: [0.12, 7], fast: [0.08, 19] };
const FIRE_HEIGHT = 0.26;
const FIRE_FLAME: FlameShape = { kind: "stretch", width: 0.16, height: FIRE_HEIGHT };

/**
 * Themis's stage instead of the rune pedestal: the tribunal, an old stone arena under an ivy archway, the sacred
 * fire of an offering basin burning gold beside her. Her Greek columns rise into it at her intro. Origin on the floor.
 */
export function Tribunal() {
  const arena = usePropMesh("tribunalArena");
  const arch = usePropMesh("tribunalArch");
  const basin = usePropMesh("offeringBasin");
  const disc = useSoftDisc();
  const materials = useMemo(
    () => ({
      fire: new SpriteMaterial({ map: disc, color: FIRE, ...HOT_GLOW }),
      halo: new SpriteMaterial({ map: disc, color: "#ffb347", opacity: 0.25, ...GLOW }),
    }),
    [disc],
  );
  useDisposal(materials);
  const basinScale = BASIN.height / 2;
  const mouth = BASIN.height / 2 + BASIN_MOUTH * basinScale;

  return (
    <group>
      <mesh
        geometry={arena.geometry}
        material={arena.material}
        scale={ARENA_RADIUS}
        position-y={-ARENA_FLOOR * ARENA_RADIUS}
        receiveShadow
      />
      <mesh
        geometry={arch.geometry}
        material={arch.material}
        scale={ARCH.height / 2}
        position={[ARCH.x, ARCH.height / 2, ARCH.z]}
      />
      <group position={[BASIN.x, 0, BASIN.z]}>
        <mesh geometry={basin.geometry} material={basin.material} scale={basinScale} position-y={BASIN.height / 2} />
        <FlickerSprite
          material={materials.fire}
          look={FIRE_FLICKER}
          shape={FIRE_FLAME}
          position={[0, mouth + FIRE_HEIGHT * 0.35, 0]}
        />
        <sprite material={materials.halo} position-y={mouth + 0.1} scale={BASIN_RIM * basinScale * 4} />
      </group>
    </group>
  );
}
