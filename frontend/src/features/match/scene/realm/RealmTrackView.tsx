"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  TubeGeometry,
  Vector3,
  type Group,
  type ShaderMaterial,
} from "three";
import { getTile } from "@/game/domain/board/board";
import { easeOutCubic } from "@/features/characters/shared/easing";
import type { Board, RealmTrack } from "@/game/domain/types";
import type { BoardPicking } from "../board/pickCursor";
import { TILE_HEIGHT, type BoardLayout, type Vec3 } from "@/features/shared/board/boardLayout";
import { TileMesh } from "../board/tile/TileMesh";
import { REALM_PALETTES } from "../board/tile/theme/palettes";
import { CorridorWalls } from "./corridor/CorridorWalls";
import { UV_VERTEX } from "./glsl";
import { ARRIVAL_OFFSET, stepPresence, tileArrival, wallRise } from "./track/arrival";
import { FlameWall } from "./track/FlameWall";
import { RIBBON_FRAGMENT } from "./track/ribbonShader";
import { TrackSparkles } from "./track/TrackSparkles";
import { HaloUnderside, MoltenUnderside } from "./track/TrackUndersides";
import { uniform } from "@/features/shared/three/uniform";

interface RealmTrackViewProps {
  track: RealmTrack;
  board: Board;
  layout: BoardLayout;
  /** Someone is on the track (or its gate is opening): it shows; otherwise it sinks away. */
  open: boolean;
  highlighted: ReadonlySet<number>;
  reachable: ReadonlySet<number>;
  /** Tiles someone stands on (what floats over them makes way). */
  occupied: ReadonlySet<number>;
  textureSize: number;
  /** Tiles being picked for an ability (apparitions in heaven): those of this track take the pick. */
  picking?: BoardPicking | null;
}

/** Tiles rise (hell) or descend (heaven) one by one from the portal, and it all sinks away once nobody's on it. */
export function RealmTrackView({
  track,
  board,
  layout,
  open,
  highlighted,
  reachable,
  occupied,
  textureSize,
  picking,
}: RealmTrackViewProps) {
  const palette = REALM_PALETTES[track.realm];
  const presence = useRef(0);
  const [flames] = useState(() => new Set<ShaderMaterial>());
  const root = useRef<Group>(null);
  const tiles = useRef<(Group | null)[]>([]);
  const walls = useRef<Group>(null);
  const ribbon = useRef<ShaderMaterial>(null);
  const positions = useMemo(() => track.tiles.map((id) => layout.position(id)), [track, layout]);
  const floorLevel = positions[0]?.[1] ?? 0;

  const ribbonGeometry = useMemo(() => {
    const lift = (position: Vec3) => new Vector3(position[0], position[1] + TILE_HEIGHT / 2 + 0.05, position[2]);
    return new TubeGeometry(new CatmullRomCurve3(positions.map(lift), false, "centripetal"), 120, 0.08, 8, false);
  }, [positions]);
  const ribbonUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uReveal: { value: 0 },
      uColor: { value: new Color(palette.glow) },
    }),
    [palette.glow],
  );

  useFrame(({ clock }, delta) => {
    presence.current = stepPresence(presence.current, open, delta);
    const amount = presence.current;
    if (root.current) root.current.visible = amount > 0.005;
    if (amount <= 0.005) return;

    const count = positions.length;
    tiles.current.forEach((tile, i) => {
      const position = positions[i];
      if (!tile || !position) return;
      const local = tileArrival(amount, i, count);
      const eased = easeOutCubic(local);
      tile.position.set(position[0], position[1] + (1 - eased) * ARRIVAL_OFFSET[track.realm], position[2]);
      tile.scale.setScalar(0.25 + 0.75 * eased);
      tile.visible = local > 0.01;
    });

    // The corridor's walls rise out of its floor as the track appears, and sink back into it.
    if (walls.current) walls.current.scale.y = wallRise(amount);

    flames.forEach((material) => {
      uniform(material, "uTime").value = clock.elapsedTime;
      uniform(material, "uOpacity").value = amount;
    });
    if (ribbon.current) {
      uniform(ribbon.current, "uTime").value = clock.elapsedTime;
      uniform(ribbon.current, "uOpacity").value = amount;
      uniform(ribbon.current, "uReveal").value = Math.min(1, amount * 1.15);
    }
  });

  return (
    <group ref={root} visible={false}>
      <mesh geometry={ribbonGeometry}>
        <shaderMaterial
          ref={ribbon}
          vertexShader={UV_VERTEX}
          fragmentShader={RIBBON_FRAGMENT}
          uniforms={ribbonUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {track.tiles.map((id, i) => {
        const tile = getTile(board, id);
        const next = tile.next ? layout.position(tile.next) : null;
        const here = positions[i];
        const arrowAngle = next && here ? Math.atan2(next[2] - here[2], next[0] - here[0]) : null;
        return (
          <group
            key={id}
            ref={(group) => {
              tiles.current[i] = group;
            }}
            position={positions[i]}
          >
            <TileMesh
              tile={tile}
              position={[0, 0, 0]}
              accent={palette.glow}
              arrowAngle={arrowAngle}
              highlighted={highlighted.has(id)}
              reachable={reachable.has(id)}
              occupied={occupied.has(id)}
              textureSize={textureSize}
              onPick={picking?.tiles.has(id) ? picking.onPick : undefined}
              pickCursor={picking?.cursor}
            />
            {track.realm === "infernal" ? (
              <>
                <MoltenUnderside color={palette.glow} />
                {i % 2 === 0 && <FlameWall flames={flames} />}
              </>
            ) : (
              <HaloUnderside color={palette.glow} phase={i} />
            )}
          </group>
        );
      })}

      {/* Scaled from the tiles' level, so the walls grow up from the corridor floor. */}
      <group ref={walls} position-y={floorLevel}>
        <group position-y={-floorLevel}>
          <CorridorWalls realm={track.realm} positions={positions} />
        </group>
      </group>

      <TrackSparkles positions={positions} color={track.realm === "infernal" ? "#ff7a2a" : "#fff1b8"} />
    </group>
  );
}
