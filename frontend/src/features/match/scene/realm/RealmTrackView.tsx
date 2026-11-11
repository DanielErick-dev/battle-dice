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
import type { Board, RealmTrack } from "@/game/domain/types";
import type { BoardPicking } from "../board/pickCursor";
import { TILE_HEIGHT, type BoardLayout, type Vec3 } from "@/features/shared/board/boardLayout";
import { TileMesh } from "../board/tile/TileMesh";
import { REALM_PALETTES } from "../board/tile/theme/palettes";
import { CorridorWalls } from "./CorridorWalls";
import { FlameWall } from "./FlameWall";
import { RIBBON_FRAGMENT, RIBBON_VERTEX } from "./ribbonShader";
import { TrackSparkles } from "./TrackSparkles";
import { HaloUnderside, MoltenUnderside } from "./TrackUndersides";

/** How fast the track rises into view and sinks away (presence per second). */
const APPEAR_RATE = 0.8;
const VANISH_RATE = 0.7;
/** Where tiles come from: up out of the lava below, or down from the sky. */
const ARRIVAL_OFFSET = { infernal: -5, celestial: 7 } as const;

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

/**
 * A realm track: a walled corridor beside the board whose tiles rise up from below (infernal)
 * or float down from the sky (celestial) one after another from the portal, joined by a
 * ribbon of flowing energy, while its walls grow around them; all of it sinks away again once
 * nobody is on it.
 */
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
    const rate = open ? APPEAR_RATE : VANISH_RATE;
    presence.current += ((open ? 1 : 0) - presence.current) * Math.min(1, delta * rate * 3);
    const amount = presence.current;
    if (root.current) root.current.visible = amount > 0.005;
    if (amount <= 0.005) return;

    const count = positions.length;
    tiles.current.forEach((tile, i) => {
      if (!tile) return;
      // Tiles arrive in order from the portal; each eases in over its own slice of the reveal.
      const local = Math.min(1, Math.max(0, amount * (count + 1.5) - i));
      const eased = 1 - (1 - local) ** 3;
      tile.position.set(positions[i][0], positions[i][1] + (1 - eased) * ARRIVAL_OFFSET[track.realm], positions[i][2]);
      tile.scale.setScalar(0.25 + 0.75 * eased);
      tile.visible = local > 0.01;
    });

    // The corridor's walls rise out of its floor as the track appears, and sink back into it.
    if (walls.current) walls.current.scale.y = Math.max(0.001, 1 - (1 - Math.min(1, amount * 1.2)) ** 3);

    flames.forEach((material) => {
      material.uniforms.uTime.value = clock.elapsedTime;
      material.uniforms.uOpacity.value = amount;
    });
    if (ribbon.current) {
      ribbon.current.uniforms.uTime.value = clock.elapsedTime;
      ribbon.current.uniforms.uOpacity.value = amount;
      ribbon.current.uniforms.uReveal.value = Math.min(1, amount * 1.15);
    }
  });

  return (
    <group ref={root} visible={false}>
      <mesh geometry={ribbonGeometry}>
        <shaderMaterial
          ref={ribbon}
          vertexShader={RIBBON_VERTEX}
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
        const arrowAngle = next ? Math.atan2(next[2] - positions[i][2], next[0] - positions[i][0]) : null;
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
      <group ref={walls} position-y={positions[0][1]}>
        <group position-y={-positions[0][1]}>
          <CorridorWalls realm={track.realm} positions={positions} />
        </group>
      </group>

      <TrackSparkles positions={positions} color={track.realm === "infernal" ? "#ff7a2a" : "#fff1b8"} />
    </group>
  );
}
