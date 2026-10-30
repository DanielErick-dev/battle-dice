"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  CylinderGeometry,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  SphereGeometry,
  type InstancedMesh,
} from "three";
import { TILE_HEIGHT, TILE_PITCH, TILE_SIZE, type Vec3 } from "../../boardLayout";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { slabBody, type SlabOutline } from "../../slab";
import { COVER_GROW, COVER_HEIGHT, COVER_Y, CRYSTALS, DRIFTS, useSnowTexture } from "./TileSpells";

const TILE_TOP = TILE_HEIGHT / 2;
/** Just over the island's ground along the trail (see islandTerrain), where the frost spreads between tiles. */
const FLOOR_Y = 0.075;
const GROW_SECONDS = 0.6;

export interface FrozenTile {
  tile: number;
  position: Vec3;
  /** The slab it covers (see BoardLayout.slab). */
  outline: SlabOutline;
}

/**
 * The tiles Eternal Winter froze (see fairy.ts), under the same snow as an enchanted tile: a white
 * slab, drifts and ice crystals in the fairy's colour; the slab between frozen tiles frosts over too,
 * so the ice reads as one field. The covers, each its slab's shape, are merged into one mesh; the
 * rest is instanced, since the ice can cover the whole path.
 */
export function WinterIce({
  tiles,
  color,
  capacity,
}: {
  tiles: readonly FrozenTile[];
  color: string;
  /** The most tiles that can ever freeze (the whole path), so the buffers never need to grow. */
  capacity: number;
}) {
  const snow = useSnowTexture();
  const assets = useMemo(() => {
    const snowMaterial = new MeshStandardMaterial({
      color: "#f4fbff",
      map: snow,
      roughness: 0.95,
      emissive: "#9fd8ff",
      emissiveIntensity: 0.12,
    });
    return {
      drift: new SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      crystal: new OctahedronGeometry(1, 0),
      // Wider than a stone's reach to the next, so the frosted ground runs on unbroken.
      frost: new CylinderGeometry(TILE_PITCH * 0.75, TILE_PITCH * 0.75, 0.03, 24),
      snowMaterial,
      frostMaterial: new MeshStandardMaterial({
        color: "#dff1ff",
        map: snow,
        roughness: 0.6,
        emissive: "#7cc8ff",
        emissiveIntensity: 0.1,
      }),
      crystalMaterial: new MeshStandardMaterial({
        color: "#e0fbff",
        emissive: new Color(color).multiplyScalar(1.4),
        emissiveIntensity: 0.8,
        metalness: 0.1,
        roughness: 0.15,
        transparent: true,
        opacity: 0.85,
      }),
    };
  }, [snow, color]);
  useEffect(
    () => () => {
      const { drift, crystal, frost, snowMaterial, frostMaterial, crystalMaterial } = assets;
      [drift, crystal, frost, snowMaterial, frostMaterial, crystalMaterial].forEach((item) => item.dispose());
    },
    [assets],
  );

  // Every cover in one mesh, rebuilt as the ice spreads.
  const covers = useMemo(() => {
    if (tiles.length === 0) return null;
    return mergeGeometries(
      tiles.map(({ outline, position: [x, y, z] }) =>
        slabBody(outline, COVER_HEIGHT, 0.04, COVER_GROW).translate(x, y + TILE_TOP + COVER_Y - COVER_HEIGHT / 2, z),
      ),
    );
  }, [tiles]);
  useEffect(() => () => covers?.dispose(), [covers]);
  const drifts = useRef<InstancedMesh>(null);
  const crystals = useRef<InstancedMesh>(null);
  const frosts = useRef<InstancedMesh>(null);
  /** When each tile froze, so a newly frozen one snows in while the rest stay put. */
  const born = useRef(new Map<number, number>());
  const settled = useRef(false);
  const primed = useRef(false);
  const place = useMemo(() => new Object3D(), []);

  useEffect(() => {
    const seen = new Set(tiles.map(({ tile }) => tile));
    for (const tile of born.current.keys()) if (!seen.has(tile)) born.current.delete(tile);
    settled.current = false;
  }, [tiles]);

  useFrame(({ clock }) => {
    if (settled.current) return;
    const now = clock.elapsedTime;
    let growing = false;
    tiles.forEach(({ tile, position: [x, y, z] }, index) => {
      // Already frozen when the board first shows (a reload mid-winter): no snowing in.
      if (!born.current.has(tile)) born.current.set(tile, primed.current ? now : -1);
      const start = born.current.get(tile)!;
      const rise = start < 0 ? 1 : Math.min(1, 0.05 + ((now - start) / GROW_SECONDS) * 0.95);
      if (rise < 1) growing = true;
      const top = y + TILE_TOP;

      DRIFTS.forEach(({ x: dx, z: dz, radius }, drift) => {
        place.position.set(x + dx * TILE_SIZE, top + (COVER_HEIGHT - 0.03) * rise, z + dz * TILE_SIZE);
        place.scale.set(radius * TILE_SIZE, radius * 0.9 * rise, radius * TILE_SIZE);
        place.updateMatrix();
        drifts.current?.setMatrixAt(index * DRIFTS.length + drift, place.matrix);
      });

      CRYSTALS.forEach(({ x: dx, z: dz, height, turn }, crystal) => {
        place.position.set(x + dx * TILE_SIZE, top + (COVER_HEIGHT + height * 0.35) * rise, z + dz * TILE_SIZE);
        place.rotation.set(0, turn, 0);
        place.scale.set(0.08, height * rise, 0.08);
        place.updateMatrix();
        crystals.current?.setMatrixAt(index * CRYSTALS.length + crystal, place.matrix);
      });

      place.rotation.set(0, 0, 0);
      place.position.set(x, FLOOR_Y, z);
      place.scale.set(rise, 1, rise);
      place.updateMatrix();
      frosts.current?.setMatrixAt(index, place.matrix);
    });
    for (const [mesh, count] of [
      [drifts.current, tiles.length * DRIFTS.length],
      [crystals.current, tiles.length * CRYSTALS.length],
      [frosts.current, tiles.length],
    ] as const) {
      if (!mesh) continue;
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    primed.current = true;
    settled.current = !growing;
  });

  return (
    <group>
      {covers && <mesh geometry={covers} material={assets.snowMaterial} receiveShadow />}
      <instancedMesh
        ref={drifts}
        args={[assets.drift, assets.snowMaterial, capacity * DRIFTS.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh ref={crystals} args={[assets.crystal, assets.crystalMaterial, capacity * CRYSTALS.length]} />
      <instancedMesh ref={frosts} args={[assets.frost, assets.frostMaterial, capacity]} receiveShadow />
    </group>
  );
}
