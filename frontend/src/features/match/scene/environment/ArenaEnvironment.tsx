"use client";

import { Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import type { BoardLayout } from "../boardLayout";
import type { MapId } from "../../maps";
import { Dungeon } from "./Dungeon";
import { Island } from "./Island";
import { Wasteland } from "./Wasteland";
import { islandShape, WATER_LEVEL } from "./islandTerrain";
import { Ocean } from "./Ocean";
import { SkyDome } from "./SkyDome";
import { RealmParticles } from "../realm/RealmParticles";
import { useRealmMix } from "../realm/RealmAtmosphere";

/** Colour where sky meets sea (SKY.mortal.horizon); the scene fog uses it too so the water fades into the horizon. */
export const HORIZON_COLOR = "#121821";

interface ArenaEnvironmentProps {
  layout: BoardLayout;
  /** Which world (see maps.ts). */
  mapId: MapId;
  /** Board size relative to the training board (see boardScaleFor). */
  scale: number;
}

/** A few faint stars between the storm clouds, gone when the celestial realm brings daylight. */
function NightStars({ radius }: { radius: number }) {
  const mix = useRealmMix();
  const group = useRef<Group>(null);
  useFrame(() => {
    if (group.current) group.current.visible = mix.current.celestial < 0.35;
  });
  return (
    <group ref={group}>
      <Stars radius={radius} depth={40} count={1000} factor={2.4} saturation={0} fade speed={0.2} />
    </group>
  );
}

/**
 * Everything around the trail, by map: the island in the night sea, the dungeon's hall or the ruined city (see
 * maps.ts); the sky and its realm changes go with the island.
 */
export function ArenaEnvironment({ layout, scale, mapId }: ArenaEnvironmentProps) {
  if (mapId === "dungeon") return <Dungeon trail={layout.trail} />;
  if (mapId === "wasteland") return <Wasteland trail={layout.trail} />;
  return <IslandWorld layout={layout} scale={scale} />;
}

function IslandWorld({ layout, scale }: { layout: BoardLayout; scale: number }) {
  const skyRadius = 95 * scale;
  const moonPosition: [number, number, number] = [-0.3 * skyRadius, 0.28 * skyRadius, -0.8 * skyRadius];
  const shape = useMemo(() => islandShape(layout.trail), [layout.trail]);
  const reach = Math.max(shape.halfWidth, shape.halfDepth + Math.abs(shape.centerZ));

  return (
    <group>
      <SkyDome radius={skyRadius} moonPosition={moonPosition} moonRadius={4 * scale} />
      <NightStars radius={70 * scale} />
      <RealmParticles radius={reach + 10} />
      <Ocean
        level={WATER_LEVEL}
        size={skyRadius * 1.9}
        shoreHalfSize={[shape.halfWidth, shape.halfDepth]}
        shoreCenterZ={shape.centerZ}
        moonPosition={moonPosition}
      />
      <Island trail={layout.trail} />
    </group>
  );
}
