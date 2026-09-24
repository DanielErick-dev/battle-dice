"use client";

import { Grid, RoundedBox, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import type { Board, Player } from "@/game/domain/types";
import { skinFor } from "../config";
import type { MatchView } from "../model/matchView";
import { CameraRig } from "./CameraRig";
import { createBoardLayout, tileOffsetFor, type BoardLayout, type Vec3 } from "./boardLayout";
import { PlayerToken } from "./PlayerToken";
import type { SpriteAnchors } from "./spriteAnchors";
import { TileLinks } from "./TileLinks";
import { TileMesh } from "./TileMesh";
import { pathColor } from "./tileTheme";
import { DICE_SIDES } from "@/game/domain/dice";

interface BoardSceneProps {
  board: Board;
  columns: number;
  view: MatchView;
  anchors: SpriteAnchors;
}

const BACKGROUND = "#05060b";

export default function BoardScene({ board, columns, view, anchors }: BoardSceneProps) {
  const layout = useMemo(() => createBoardLayout(board.tiles.length, columns), [board, columns]);
  const highlighted = new Set(view.effect ? [view.effect.from, view.effect.to] : []);
  const reachable = reachableTiles(view, board);
  const lastTile = board.tiles.length;

  return (
    <Canvas shadows="percentage" dpr={[1, 2]} camera={{ fov: 40 }}>
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 30, 70]} />

      <ambientLight intensity={0.3} />
      <hemisphereLight args={["#8fa3ff", "#1b0b22", 0.5]} />
      <directionalLight
        position={[7, 14, 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={13}
        shadow-camera-bottom={-13}
      />

      <Stars radius={70} depth={40} count={3000} factor={3.5} fade speed={0.5} />
      <Grid
        infiniteGrid
        position-y={-0.55}
        cellSize={0.75}
        cellColor="#1a1f33"
        sectionSize={4.5}
        sectionColor="#2a2350"
        fadeDistance={40}
        fadeStrength={2}
      />

      <Platform layout={layout} />
      {board.tiles.map((tile) => (
        <TileMesh
          key={tile.id}
          tile={tile}
          position={layout.position(tile.id)}
          accent={pathColor((tile.id - 1) / (lastTile - 1))}
          arrowAngle={tile.id < lastTile ? directionBetween(layout, tile.id, tile.id + 1) : null}
          highlighted={highlighted.has(tile.id)}
          reachable={reachable.has(tile.id)}
        />
      ))}
      <TileLinks board={board} layout={layout} activeFrom={view.effect?.from ?? null} />

      {view.players.map((player) => (
        <PlayerToken
          key={player.id}
          playerId={player.id}
          skin={skinFor(player.id)}
          target={tokenTarget(player, view.players, layout)}
          isTeleporting={view.effect?.playerId === player.id}
          isActive={view.activePlayerId === player.id}
          anchors={anchors}
        />
      ))}

      <CameraRig layout={layout} />
    </Canvas>
  );
}

function Platform({ layout }: { layout: BoardLayout }) {
  const width = layout.width + 1.4;
  const depth = layout.depth + 1.4;

  return (
    <RoundedBox args={[width, 0.5, depth]} radius={0.3} position-y={-0.38} receiveShadow>
      <meshStandardMaterial color="#0b0d18" emissive="#2a1a5e" emissiveIntensity={0.12} roughness={0.8} metalness={0.3} />
    </RoundedBox>
  );
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
