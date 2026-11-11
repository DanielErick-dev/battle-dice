"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, type Group, type MeshBasicMaterial, type MeshStandardMaterial } from "three";
import type { Tile } from "@/game/domain/types";
import { TILE_HEIGHT, type BoardLayout, type Vec3 } from "@/features/shared/board/boardLayout";
import { SQUARE_SLAB } from "@/features/shared/board/slab";
import { pickCursor, type PickCursor } from "../pickCursor";
import { useTileFaceTexture } from "./face/useTileFaceTexture";
import { FinishBeacon } from "./ornaments/FinishBeacon";
import { TileOrnaments } from "./ornaments/TileOrnaments";
import { themeFor } from "./theme/tileTheme";
import { TileTag } from "./TileTag";
import { useSlabGeometry } from "./useSlabGeometry";

const HIGHLIGHT_FALLBACK = "#f97316";

interface TileMeshProps {
  tile: Tile;
  position: Vec3;
  /** Its slab of the road (see BoardLayout.slab); a square slab without one (realm tracks). */
  slab?: ReturnType<BoardLayout["slab"]>;
  /** Path colour at this tile (see pathColor). */
  accent: string;
  /** Direction to the next tile on the face texture, or null on the last tile. */
  arrowAngle: number | null;
  /** Portal/trap in action: flashes the tile. */
  highlighted: boolean;
  /** Within reach of the active player's next roll: breathes softly. */
  reachable: boolean;
  /** Face texture size in pixels. */
  textureSize: number;
  /** Part of a stretch hiding traps. */
  inTrapZone?: boolean;
  /** Its harm was smashed or swallowed by the Void: drawn as a wreck. */
  destroyed?: boolean;
  /** Buried under a spell (the fairy's snow, black fire): what stands on the tile is hidden. */
  covered?: boolean;
  /**
   * Someone stands on it: what floats over the tile (a card, a die, an hourglass) makes way for
   * them instead of turning inside them, and the finish's trophy rises over their head.
   */
  occupied?: boolean;
  /** Can be picked for an ability (seals, apparitions, black fire): breathes, and a click picks it. */
  onPick?: (tile: number) => void;
  /** The pointer over it while it can be picked (an enchanted hand; the plain pointer without one). */
  pickCursor?: PickCursor;
}

/** Pixels the pointer may move between press and release for it to still count as a click, not a drag. */
const CLICK_SLOP = 6;

/** The side of the slab, a weathered grey; the face carries the colour (see useTileFaceTexture). */
const STONE_SIDE = "#5a554f";

export function TileMesh({
  tile,
  position,
  slab,
  accent,
  arrowAngle,
  highlighted,
  reachable,
  textureSize,
  inTrapZone = false,
  destroyed = false,
  covered = false,
  occupied = false,
  onPick,
  pickCursor: cursor,
}: TileMeshProps) {
  /** The pointer is over it while it can be picked: it rises and lights up. */
  const [hovered, setHovered] = useState(false);
  if (hovered && !onPick) setHovered(false);
  /** The pointer is over it at all: what the stone does shows in a tag above it. */
  const [peeking, setPeeking] = useState(false);
  const { outline, heading: way } = slab ?? { outline: SQUARE_SLAB, heading: 0 };
  // Laid along the way, but never upside down to the camera: on rows running right to left it turns round.
  const heading = Math.cos(way) < 0 ? way + Math.PI : way;
  const shapes = useSlabGeometry(outline, heading);
  const hovering = hovered && onPick !== undefined;
  // Picked (or the picking over) under the pointer: the pointer goes back to normal.
  useEffect(() => {
    if (!hovering) return;
    document.body.style.cursor = cursor ? pickCursor(cursor) : "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovering, cursor]);
  const theme = useMemo(() => themeFor(tile, { inTrapZone, destroyed }), [tile, inTrapZone, destroyed]);
  const emissive = theme.glowIntensity > 0 ? theme.glow : HIGHLIGHT_FALLBACK;
  const glowColor = theme.kind === "regular" ? accent : theme.glow;
  const faceTexture = useTileFaceTexture({
    tileId: tile.id,
    theme,
    accent,
    // The face is laid along the way: its arrows point relative to that.
    arrowAngle: arrowAngle === null ? null : arrowAngle - heading,
    resolution: textureSize,
  });
  const bodyMaterial = useRef<MeshStandardMaterial>(null);
  const underglow = useRef<MeshBasicMaterial>(null);
  const lift = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    if (bodyMaterial.current) {
      const pulse = highlighted ? 1.2 + Math.sin(time * 10) * 0.6 : hovering ? 0.9 + Math.sin(time * 8) * 0.25 : 0;
      bodyMaterial.current.emissiveIntensity = theme.glowIntensity * 0.35 + pulse;
    }
    if (underglow.current) {
      const breathe = hovering ? 1 : reachable || onPick ? 0.75 + Math.sin(time * 4 - tile.id * 0.6) * 0.2 : 0.38;
      underglow.current.opacity += (breathe - underglow.current.opacity) * Math.min(1, delta * 8);
      underglow.current.color.set(hovering ? "#ffffff" : glowColor);
    }
    if (lift.current) {
      const target = hovering ? 0.32 : reachable || onPick ? 0.06 : 0;
      lift.current.position.y += (target - lift.current.position.y) * Math.min(1, delta * 8);
    }
  });

  return (
    <group position={position}>
      <mesh geometry={shapes.glow} position-y={-TILE_HEIGHT / 2 + 0.03} scale={[1.12, 1, 1.12]}>
        <meshBasicMaterial
          ref={underglow}
          color={glowColor}
          transparent
          opacity={0.38}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <group ref={lift}>
        {/*
          Only the slab itself takes the pick: what stands on a tile (a floating card, an hourglass)
          can reach over the tile behind it on screen, and must not steal its click.
        */}
        <group
          onClick={
            onPick &&
            ((event) => {
              // A drag across the board (to look around) isn't a pick.
              if (event.delta > CLICK_SLOP) return;
              event.stopPropagation();
              onPick(tile.id);
            })
          }
          onPointerOver={(event) => {
            // Only the tile nearest the pointer lights up, not the ones behind it.
            event.stopPropagation();
            setPeeking(true);
            if (onPick) setHovered(true);
          }}
          onPointerOut={() => {
            setPeeking(false);
            setHovered(false);
          }}
        >
          <mesh geometry={shapes.body} castShadow receiveShadow>
            <meshStandardMaterial
              ref={bodyMaterial}
              color={STONE_SIDE}
              emissive={emissive}
              roughness={0.9}
              flatShading
            />
          </mesh>

          <mesh geometry={shapes.face} position-y={TILE_HEIGHT / 2 + 0.004} receiveShadow>
            <meshStandardMaterial map={faceTexture} roughness={0.85} />
          </mesh>
        </group>
        {peeking && theme.label && <TileTag theme={theme} />}

        {!covered && (
          <TileOrnaments
            tile={tile}
            theme={theme}
            highlighted={highlighted}
            arrowAngle={arrowAngle}
            occupied={occupied}
          />
        )}

        {tile.role === "finish" && <FinishBeacon color={theme.glow} occupied={occupied} />}
      </group>
    </group>
  );
}
