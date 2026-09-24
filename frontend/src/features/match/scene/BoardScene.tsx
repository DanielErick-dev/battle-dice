"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { DICE_SIDES } from "@/game/domain/dice";
import type { Board, Player } from "@/game/domain/types";
import { EFFECTS_QUALITY, skinFor } from "../config";
import type { MatchView } from "../model/matchView";
import { boardScaleFor, CameraRig } from "./CameraRig";
import { createBoardLayout, tileOffsetFor, TILE_PITCH, type BoardLayout, type Vec3 } from "./boardLayout";
import { ArenaEnvironment, HORIZON_COLOR } from "./environment/ArenaEnvironment";
import { DiceThrow } from "./DiceThrow";
import { PlayerToken } from "./PlayerToken";
import { PostEffects } from "./PostEffects";
import type { SpriteAnchors } from "./spriteAnchors";
import { TileLinks } from "./TileLinks";
import { TileMesh } from "./TileMesh";
import { pathColor } from "./tileTheme";

interface BoardSceneProps {
  board: Board;
  columns: number;
  view: MatchView;
  anchors: SpriteAnchors;
  /** Close-up camera that follows the action (for boards too big to frame whole). */
  followCamera: boolean;
  /** The 3D die hit the ground; strength is 1 for the first impact and smaller after. */
  onDiceImpact: (strength: number) => void;
}

/** Above this many tiles, face textures drop to half resolution to save GPU memory. */
const HIGH_RES_TILE_LIMIT = 50;

export default function BoardScene({ board, columns, view, anchors, followCamera, onDiceImpact }: BoardSceneProps) {
  const layout = useMemo(() => createBoardLayout(board.tiles.length, columns), [board, columns]);
  const scale = boardScaleFor(layout);
  const shadowExtent = Math.max(layout.width, layout.depth) / 2 + 3;
  const textureSize = board.tiles.length > HIGH_RES_TILE_LIMIT ? 256 : 512;
  const highlighted = new Set(view.effect ? [view.effect.from, view.effect.to] : []);
  const reachable = reachableTiles(view, board);
  const lastTile = board.tiles.length;

  // Antialiasing happens in the effect composer (multisampling), not on the canvas.
  return (
    <Canvas shadows="percentage" dpr={[1, 2]} camera={{ fov: 40 }} gl={{ antialias: false }}>
      <color attach="background" args={[HORIZON_COLOR]} />
      <fog attach="fog" args={[HORIZON_COLOR, 30 * scale, 85 * scale]} />

      <ambientLight intensity={0.3} />
      <hemisphereLight args={["#8fa3ff", "#1b0b22", 0.5]} />
      <directionalLight
        position={[7 * scale, 14 * scale, 8 * scale]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-far={60 * scale}
      />
      {/* Cool rim light from the moon's side of the sky. */}
      <directionalLight position={[-0.3, 0.28, -0.8]} intensity={0.45} color="#b9b0ff" />

      <ArenaEnvironment layout={layout} scale={scale} />
      {board.tiles.map((tile) => (
        <TileMesh
          key={tile.id}
          tile={tile}
          position={layout.position(tile.id)}
          accent={pathColor((tile.id - 1) / (lastTile - 1))}
          arrowAngle={tile.id < lastTile ? directionBetween(layout, tile.id, tile.id + 1) : null}
          highlighted={highlighted.has(tile.id)}
          reachable={reachable.has(tile.id)}
          textureSize={textureSize}
        />
      ))}
      <TileLinks board={board} layout={layout} activeFrom={view.effect?.from ?? null} />

      {view.players.map((player) => (
        <PlayerToken
          key={player.id}
          playerId={player.id}
          skin={skinFor(player.id)}
          target={tokenTarget(player, view.players, layout)}
          isTeleporting={isTeleport(view.effect) && view.effect?.playerId === player.id}
          isActive={view.activePlayerId === player.id}
          isPowered={view.poweredPlayerId === player.id}
          anchors={anchors}
        />
      ))}

      <DiceThrow roll={view.roll} landing={diceLanding(view, layout)} onImpact={onDiceImpact} />

      <CameraRig
        layout={layout}
        focus={focusPoint(view, layout)}
        follow={followCamera}
        effect={view.effect}
        celebrating={view.winnerId !== null}
      />
      <PostEffects quality={EFFECTS_QUALITY} />
    </Canvas>
  );
}

/** The player the camera should watch: whoever is moving, else whoever plays next. */
function focusPoint(view: MatchView, layout: BoardLayout): Vec3 {
  const id = view.movingPlayerId ?? view.activePlayerId;
  const player = view.players.find((candidate) => candidate.id === id);
  return player ? layout.position(player.position) : [0, 0, 0];
}

/** Beside the thrower's tile, towards the camera, so the die lands in view. */
function diceLanding(view: MatchView, layout: BoardLayout): Vec3 {
  const [x, y, z] = focusPoint(view, layout);
  return [x + TILE_PITCH * 0.45, y, z + TILE_PITCH * 0.5];
}

function isTeleport(effect: MatchView["effect"]): boolean {
  return effect?.kind === "portal" || effect?.kind === "trap";
}

/** Tiles the active player can land on with the next roll, shown only while waiting for it. */
function reachableTiles(view: MatchView, board: Board): Set<number> {
  if (view.isAnimating || view.winnerId !== null) return new Set();
  const from = view.players.find((player) => player.id === view.activePlayerId)?.position ?? board.startTile;
  const tiles = new Set<number>();
  for (let step = 1; step <= DICE_SIDES && from + step <= board.finishTile; step++) tiles.add(from + step);
  return tiles;
}

/** Angle from one tile to another on the face texture (canvas x = world x, canvas y = world z). */
function directionBetween(layout: BoardLayout, from: number, to: number): number {
  const [x1, , z1] = layout.position(from);
  const [x2, , z2] = layout.position(to);
  return Math.atan2(z2 - z1, x2 - x1);
}

function tokenTarget(player: Player, players: readonly Player[], layout: BoardLayout): Vec3 {
  const [x, y, z] = layout.position(player.position);
  const [dx, , dz] = tileOffsetFor(player, players);
  return [x + dx, y, z + dz];
}
