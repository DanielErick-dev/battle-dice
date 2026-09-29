"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { getTile } from "@/game/domain/board";
import { DICE_SIDES } from "@/game/domain/dice";
import type { Board, Player, RealmKind } from "@/game/domain/types";
import { characterFor, playerColor } from "../characters";
import type { EffectsQuality } from "../config";
import type { MatchView } from "../model/matchView";
import { boardScaleFor, CameraRig } from "./CameraRig";
import { createBoardLayout, tileOffsetFor, TILE_PITCH, type BoardLayout, type Vec3 } from "./boardLayout";
import { ArenaEnvironment, HORIZON_COLOR } from "./environment/ArenaEnvironment";
import { ArcaneBeam } from "./CardEffects";
import { LEVITATE_HEIGHT } from "./character/figure";
import { DiceThrow } from "./DiceThrow";
import { HiddenTrapBurst } from "./HiddenTrapBurst";
import { PlayerToken } from "./PlayerToken";
import { PostEffects } from "./PostEffects";
import { RealmAtmosphere } from "./realm/RealmAtmosphere";
import { RealmGate } from "./realm/RealmGate";
import { RealmTrackView } from "./realm/RealmTrackView";
import { TileLinks } from "./TileLinks";
import { TileMesh } from "./TileMesh";
import { SmashedTrapMark } from "./TrapSmash";
import { pathColor } from "./tileTheme";

interface BoardSceneProps {
  board: Board;
  columns: number;
  view: MatchView;
  /** Close-up camera that follows the action (for boards too big to frame whole). */
  followCamera: boolean;
  /** The 3D die hit the ground; strength is 1 for the first impact and smaller after. */
  onDiceImpact: (strength: number) => void;
  /** "low" also renders at 1× pixel density, on top of lighter screen effects. */
  quality: EffectsQuality;
}

/** Above this many tiles, face textures drop to half resolution to save GPU memory. */
const HIGH_RES_TILE_LIMIT = 50;
/** Glow in the cracks of a trap the Trap Ward smashed (the void violet of its wielder). */
const SMASHED_TRAP_COLOR = "#8b5cf6";

export default function BoardScene({ board, columns, view, followCamera, onDiceImpact, quality }: BoardSceneProps) {
  const layout = useMemo(() => createBoardLayout(board, columns), [board, columns]);
  const mainTiles = useMemo(() => board.tiles.filter((tile) => !tile.track), [board]);
  const trapZoneTiles = useMemo(() => new Set(board.trapZones.flatMap((zone) => zone.tiles)), [board]);
  const scale = boardScaleFor(layout);
  const shadowExtent = Math.max(layout.width, layout.depth) / 2 + 3;
  const textureSize = board.finishTile > HIGH_RES_TILE_LIMIT ? 256 : 512;
  const highlighted = new Set(view.effect ? [view.effect.from, view.effect.to] : []);
  const reachable = reachableTiles(view, board);
  const lastTile = board.finishTile;
  const openTracks = openTrackPortals(view, board);
  const focusRealm = realmAt(board, focusTile(view));
  const gate = view.effect?.kind === "realmEnter" ? view.effect : null;

  // Antialiasing happens in the effect composer (multisampling), not on the canvas.
  return (
    <Canvas shadows="percentage" dpr={quality === "high" ? [1, 2] : 1} camera={{ fov: 40 }} gl={{ antialias: false }}>
      <color attach="background" args={[HORIZON_COLOR]} />
      <fog attach="fog" args={[HORIZON_COLOR, 30 * scale, 85 * scale]} />

      <RealmAtmosphere realm={focusRealm}>
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
        {mainTiles.map((tile) => (
          <TileMesh
            key={tile.id}
            tile={tile}
            position={layout.position(tile.id)}
            accent={pathColor((tile.id - 1) / (lastTile - 1))}
            arrowAngle={tile.next !== null ? directionBetween(layout, tile.id, tile.next) : null}
            highlighted={highlighted.has(tile.id)}
            reachable={reachable.has(tile.id)}
            textureSize={textureSize}
            inTrapZone={trapZoneTiles.has(tile.id)}
            destroyed={view.destroyedTraps.includes(tile.id)}
          />
        ))}
        <TileLinks board={board} layout={layout} activeFrom={view.effect?.from ?? null} />
        {board.tracks.map((track) => (
          <RealmTrackView
            key={track.portal}
            track={track}
            board={board}
            layout={layout}
            open={openTracks.has(track.portal)}
            highlighted={highlighted}
            reachable={reachable}
            textureSize={textureSize}
          />
        ))}
        {gate?.realm && <RealmGate key={effectKey(gate)} realm={gate.realm} position={layout.position(gate.from)} />}
        {view.destroyedTraps.map((tile) => (
          <SmashedTrapMark key={tile} tile={tile} position={layout.position(tile)} color={SMASHED_TRAP_COLOR} />
        ))}
        {view.effect?.kind === "hiddenTrap" && (
          <HiddenTrapBurst key={effectKey(view.effect)} position={layout.position(view.effect.from)} />
        )}

        {view.players.map((player) => (
          <PlayerToken
            key={player.id}
            color={playerColor(player.id)}
            model={characterFor(player.id)?.model ?? null}
            energyBlades={characterFor(player.id)?.energyBlades ?? false}
            castImpactSeconds={characterFor(player.id)?.castImpactSeconds ?? null}
            target={tokenTarget(player, view.players, layout)}
            pathDirection={pathDirection(board, layout, player.position)}
            isTeleporting={isTeleport(view.effect) && view.effect?.playerId === player.id}
            isActive={view.activePlayerId === player.id}
            isPowered={view.poweredPlayerId === player.id}
            isShielded={player.shielded}
            shieldColor={characterFor(player.id)?.shieldColor}
            isLevitating={player.levitating > 0}
            diceBoost={player.diceBoost}
            cast={view.cast?.playerId === player.id ? view.cast : null}
            abilityCast={
              view.effect?.kind === "abilityUsed" && view.effect.playerId === player.id ? effectKey(view.effect) : null
            }
          />
        ))}

        {view.cast?.card.cardId === "arcaneBlast" && view.cast.targetId && (
          <ArcaneBeam
            key={view.cast.id}
            from={tokenPosition(view, layout, view.cast.playerId)}
            to={tokenPosition(view, layout, view.cast.targetId)}
          />
        )}

        {[0, 1].map((index) => (
          <DiceThrow
            key={index}
            roll={dieRoll(view, index)}
            landing={diceLanding(view, board, layout, index)}
            onImpact={onDiceImpact}
            realm={focusRealm}
          />
        ))}

        <CameraRig
          layout={layout}
          focus={focusPoint(view, layout)}
          follow={followCamera || focusRealm !== null}
          effect={view.effect}
          celebrating={view.winnerId !== null}
          cast={view.cast}
        />
      </RealmAtmosphere>
      <PostEffects quality={quality} />
    </Canvas>
  );
}

/** The tile of the player the camera should watch: whoever is moving, else whoever plays next. */
function focusTile(view: MatchView): number | null {
  const id = view.movingPlayerId ?? view.activePlayerId;
  return view.players.find((candidate) => candidate.id === id)?.position ?? null;
}

function focusPoint(view: MatchView, layout: BoardLayout): Vec3 {
  const tile = focusTile(view);
  return tile === null ? [0, 0, 0] : layout.position(tile);
}

/** The realm a tile belongs to, or null on the main path: the world takes on its look. */
function realmAt(board: Board, tile: number | null): RealmKind | null {
  return tile === null ? null : (getTile(board, tile).track?.realm ?? null);
}

/** Tracks showing: someone is on them, or their gate is opening right now. */
function openTrackPortals(view: MatchView, board: Board): Set<number> {
  const portals = new Set<number>();
  for (const player of view.players) {
    const portal = getTile(board, player.position).track?.portal;
    if (portal !== undefined) portals.add(portal);
  }
  if (view.effect?.kind === "realmEnter") portals.add(view.effect.from);
  return portals;
}

/** A fresh key per effect shown (a gate opening, a trap springing), so each one plays from the start. */
const effectKeys = new WeakMap<object, number>();
let nextEffectKey = 0;
function effectKey(effect: object): number {
  if (!effectKeys.has(effect)) effectKeys.set(effect, nextEffectKey++);
  return effectKeys.get(effect)!;
}

/** Where a player's figure is: on their tile, raised while they levitate. */
function tokenPosition(view: MatchView, layout: BoardLayout, playerId: string): Vec3 {
  const player = view.players.find((candidate) => candidate.id === playerId);
  if (!player) return [0, 0, 0];
  const [x, y, z] = layout.position(player.position);
  return [x, y + (player.levitating > 0 ? LEVITATE_HEIGHT : 0), z];
}

/** The `index`-th die of the current throw (a second one only under Berserk Fury or Oracle Eye). */
function dieRoll(view: MatchView, index: number): { id: number; value: number } | null {
  const value = view.roll?.dice[index];
  return view.roll && value !== undefined ? { id: view.roll.id, value } : null;
}

/**
 * Beside the thrower's tile, towards the camera, so the dice land in view; a second die lands alongside.
 * On a realm track, on the tiles ahead.
 */
function diceLanding(view: MatchView, board: Board, layout: BoardLayout, index: number): Vec3 {
  const tile = focusTile(view);
  // Realm track tiles float apart, with nothing beside them to land on: the dice land on the
  // tiles ahead instead, at their height.
  if (tile !== null && getTile(board, tile).track) {
    let ahead = tile;
    for (let step = 0; step <= index; step++) ahead = getTile(board, ahead).next ?? ahead;
    return layout.position(ahead);
  }
  const [x, y, z] = focusPoint(view, layout);
  return [x + TILE_PITCH * (0.45 + index * 0.5), y, z + TILE_PITCH * (0.5 - index * 0.15)];
}

function isTeleport(effect: MatchView["effect"]): boolean {
  return (
    effect?.kind === "portal" ||
    effect?.kind === "trap" ||
    effect?.kind === "hiddenTrap" ||
    effect?.kind === "teleport" ||
    effect?.kind === "realmEnter"
  );
}

/** Tiles the active player can land on with the next roll, shown only while waiting for it. */
function reachableTiles(view: MatchView, board: Board): Set<number> {
  if (view.isAnimating || view.winnerId !== null) return new Set();
  let tile: number | null =
    view.players.find((player) => player.id === view.activePlayerId)?.position ?? board.startTile;
  const tiles = new Set<number>();
  for (let step = 1; step <= DICE_SIDES; step++) {
    tile = getTile(board, tile).next;
    if (tile === null) break;
    tiles.add(tile);
  }
  return tiles;
}

/** Angle from one tile to another on the face texture (canvas x = world x, canvas y = world z). */
function directionBetween(layout: BoardLayout, from: number, to: number): number {
  const [x1, , z1] = layout.position(from);
  const [x2, , z2] = layout.position(to);
  return Math.atan2(z2 - z1, x2 - x1);
}

/** Which way the path runs at a tile (towards the next one; into the finish on the last). */
function pathDirection(board: Board, layout: BoardLayout, tile: number): Vec3 {
  const { next, previous } = getTile(board, tile);
  const [from, to] = next !== null ? [tile, next] : [previous ?? tile, tile];
  const [x1, , z1] = layout.position(from);
  const [x2, , z2] = layout.position(to);
  return [x2 - x1, 0, z2 - z1];
}

function tokenTarget(player: Player, players: readonly Player[], layout: BoardLayout): Vec3 {
  const [x, y, z] = layout.position(player.position);
  const [dx, , dz] = tileOffsetFor(player, players);
  return [x + dx, y, z + dz];
}
