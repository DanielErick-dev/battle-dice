"use client";

import { Preload } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import { Vector3 } from "three";
import { getTile } from "@/game/domain/board";
import { withRifts } from "@/game/domain/void";
import { DICE_SIDES } from "@/game/domain/dice";
import { frozenTiles } from "@/game/domain/fairy";
import type { Board, PlayerId, TileId } from "@/game/domain/types";
import { characterFor, playerColor } from "../characters";
import type { EffectsQuality } from "../config";
import type { MatchView } from "../model/matchView";
import { createBoardLayout, withRiftPositions, type BoardLayout, type Vec3 } from "./boardLayout";
import { boardScaleFor, CameraRig, type CameraFraming } from "./CameraRig";
import { diceLanding, dieRoll, focusPoint, focusTile, realmAt } from "./cameraFocus";
import { PickedTileMark } from "./character/shared/PickedTileMark";
import { DiceThrow } from "./DiceThrow";
import { BOARD_EFFECTS, OVERLAY_EFFECTS, type BoardFx } from "./effects";
import { ArenaEnvironment, HORIZON_COLOR } from "./environment/ArenaEnvironment";
import type { MapId } from "../maps";
import type { PickCursor } from "./pickCursor";
import { PlayerToken } from "./PlayerToken";
import { PostEffects } from "./PostEffects";
import { RealmAtmosphere } from "./realm/RealmAtmosphere";
import { RealmTrackView } from "./realm/RealmTrackView";
import { SceneWarmup } from "./SceneWarmup";
import { TileLinks } from "./TileLinks";
import { TileMesh } from "./TileMesh";
import { pathColor } from "./tileTheme";
import { pathDirection, tokenTarget } from "./tokenPlacement";
import { tokenSignals } from "./tokenSignals";
import { HealingParticles } from "./vfx/healing";

/** Tiles being picked for an ability, right on the board (see TilePicking). */
export interface BoardPicking {
  /** The tiles that can be picked: they breathe and take clicks. */
  tiles: ReadonlySet<TileId>;
  /** Those picked so far, each marked with its tag in its colour. */
  picked: readonly { tile: TileId; tag: string; color: string }[];
  onPick: (tile: TileId) => void;
  /** The pointer over a pickable tile (see pickCursor): whose ability is being placed. */
  cursor: PickCursor;
}

interface BoardSceneProps {
  board: Board;
  columns: number;
  /** The world around the trail (see maps.ts). */
  mapId: MapId;
  view: MatchView;
  /** How the camera frames the play (following the action matters on boards too big to frame whole). */
  cameraFraming: CameraFraming;
  /** Strength is 1 for the first impact and smaller after. */
  onDiceImpact: (strength: number) => void;
  /** "low" also renders at 1× pixel density. */
  quality: EffectsQuality;
  /** Sees what their own seals and apparitions are; null shows no secrets. */
  viewerId: PlayerId | null;
  /** The scene waits for every one of these models before it shows. */
  models: readonly string[];
  /** Everything has loaded and been compiled on the GPU. */
  onReady: () => void;
  /** The camera follows nobody (see CameraRig). */
  freeLook: boolean;
  picking: BoardPicking | null;
  onFreeLook: () => void;
}

/** Zarek's violet, on the rifts his Void opens. */
const RIFT_ACCENT = "#8b5cf6";

/** Above this many tiles, face textures drop to half resolution to save GPU memory. */
const HIGH_RES_TILE_LIMIT = 50;

export default function BoardScene({
  board: plainBoard,
  columns,
  mapId,
  view,
  cameraFraming,
  onDiceImpact,
  quality,
  viewerId,
  models,
  onReady,
  freeLook,
  onFreeLook,
  picking,
}: BoardSceneProps) {
  const roadLayout = useMemo(() => createBoardLayout(plainBoard, columns), [plainBoard, columns]);
  // The path as it stands, with the rifts Zarek's Void opened linked in beside the road.
  const board = useMemo(() => withRifts(plainBoard, view.rifts), [plainBoard, view.rifts]);
  const layout = useMemo(() => withRiftPositions(roadLayout, board), [roadLayout, board]);
  const playerIds = view.players.map((player) => player.id).join(",");
  const wandTips = useMemo(
    () => new Map(playerIds.split(",").map((id) => [id as PlayerId, new Vector3()])),
    [playerIds],
  );
  const occupiedTiles = new Set(view.players.map((player) => player.position));
  const mainTiles = useMemo(() => board.tiles.filter((tile) => !tile.track), [board]);
  const trapZoneTiles = useMemo(() => new Set(board.trapZones.flatMap((zone) => zone.tiles)), [board]);
  // Snowed-over, frozen and burning tiles hide what stands on them under the spell.
  const coveredTiles = useMemo(
    () =>
      new Set([
        ...[...view.enchantedTiles, ...view.blackFlames].map(({ tile }) => tile),
        ...frozenTiles(view.winter, board.startTile),
      ]),
    [view.enchantedTiles, view.blackFlames, view.winter, board.startTile],
  );
  const scale = boardScaleFor(layout);
  const shadowExtent = Math.max(layout.width, layout.depth) / 2 + 3;
  const textureSize = board.finishTile > HIGH_RES_TILE_LIMIT ? 256 : 512;
  const highlighted = new Set(view.effect ? [view.effect.from, view.effect.to] : []);
  const reachable = reachableTiles(view, board);
  const lastTile = board.finishTile;
  const openTracks = openTrackPortals(view, board);
  const fx: BoardFx = {
    view,
    board,
    layout,
    viewerId,
    wandTips,
    // Spells on a realm's tiles go with its track: gone while it's sunk away.
    shown: (tile) => {
      const portal = getTile(board, tile).track?.portal;
      return portal === undefined || openTracks.has(portal);
    },
  };
  const focusRealm = realmAt(board, focusTile(view));

  // Antialiasing happens in the effect composer (multisampling), not on the canvas.
  return (
    <Canvas
      shadows="percentage"
      dpr={quality === "high" ? [1, 2] : 1}
      camera={{ fov: 40 }}
      gl={{ antialias: false }}
      onCreated={({ gl }) => {
        watchContext(gl.domElement);
        // Hell's Drag's hand is cut at the floor as it comes out of it (see HellHand).
        gl.localClippingEnabled = true;
      }}
    >
      <color attach="background" args={[HORIZON_COLOR]} />
      {/* Closer in than a clear night: the far shore and the sea sink into the murk. */}
      <fog attach="fog" args={[HORIZON_COLOR, 26 * scale, 78 * scale]} />

      {/* Nothing shows until every model has loaded; then it's all compiled before the match starts. */}
      <Suspense fallback={null}>
        <RealmAtmosphere realm={focusRealm}>
          {/* Cold moonlight; warmth comes only from fires, torches and lanterns. */}
          <directionalLight
            position={[7 * scale, 14 * scale, 8 * scale]}
            intensity={1.55}
            color="#c6d1e6"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-shadowExtent}
            shadow-camera-right={shadowExtent}
            shadow-camera-top={shadowExtent}
            shadow-camera-bottom={-shadowExtent}
            shadow-camera-far={60 * scale}
          />
          {/* Cool rim light from the moon's side of the sky. */}
          <directionalLight position={[-0.3, 0.28, -0.8]} intensity={0.5} color="#8da0c2" />

          <ArenaEnvironment layout={roadLayout} scale={scale} mapId={mapId} />
          {/* Pools of particles in world space, fed by emitters on the tokens. */}
          <HealingParticles />
          {mainTiles.map((tile) => (
            <TileMesh
              key={tile.id}
              tile={tile}
              position={layout.position(tile.id)}
              slab={layout.slab(tile.id)}
              accent={tile.rift ? RIFT_ACCENT : pathColor((tile.id - 1) / (lastTile - 1))}
              arrowAngle={tile.next !== null ? directionBetween(layout, tile.id, tile.next) : null}
              highlighted={highlighted.has(tile.id)}
              reachable={reachable.has(tile.id)}
              textureSize={textureSize}
              inTrapZone={trapZoneTiles.has(tile.id)}
              destroyed={view.destroyedTraps.includes(tile.id)}
              covered={coveredTiles.has(tile.id)}
              occupied={occupiedTiles.has(tile.id)}
              onPick={picking?.tiles.has(tile.id) ? picking.onPick : undefined}
              pickCursor={picking?.cursor}
            />
          ))}
          {picking?.picked.map(({ tile, tag, color }) => (
            <PickedTileMark key={`picked${tile}`} position={layout.position(tile)} tag={tag} color={color} />
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
              occupied={occupiedTiles}
              textureSize={textureSize}
              picking={picking}
            />
          ))}
          {/* Apart, so an effect whose models are still loading never blanks the whole scene. */}
          {BOARD_EFFECTS.map((Effect, index) => (
            <Suspense key={index} fallback={null}>
              <Effect fx={fx} />
            </Suspense>
          ))}

          {view.players.map((player, seat) => (
            <PlayerToken
              key={player.id}
              player={player}
              character={characterFor(player.id)}
              nameTag={
                view.players.length > 1 ? { text: `J${seat + 1} ${player.name.split(" ")[0]}`, seat } : undefined
              }
              color={playerColor(player.id)}
              target={tokenTarget(player, view, board, layout)}
              pathDirection={pathDirection(board, layout, player.position)}
              signals={tokenSignals(view, player)}
              wandTip={wandTips.get(player.id)}
              faceToward={judgedBy(view, layout, player.id)}
            />
          ))}
          {OVERLAY_EFFECTS.map((Effect, index) => (
            <Effect key={index} fx={fx} />
          ))}

          {[0, 1].map((index) => (
            <DiceThrow
              key={`die${index}`}
              roll={dieRoll(view, index)}
              landing={diceLanding(view, board, layout, index)}
              onImpact={onDiceImpact}
              realm={focusRealm}
            />
          ))}

          <CameraRig
            layout={layout}
            focus={focusPoint(view, layout)}
            // A realm track is off the board: framing the whole board would lose the player.
            framing={cameraFraming === "board" && focusRealm !== null ? "close" : cameraFraming}
            effect={view.effect}
            celebrating={view.winnerId !== null}
            cast={view.fx.cast}
            free={freeLook}
            onFreeLook={onFreeLook}
          />
        </RealmAtmosphere>
        <Preload all />
        <SceneWarmup models={models} onReady={onReady} />
      </Suspense>
      <PostEffects quality={quality} />
    </Canvas>
  );
}

/** Tracks showing: someone is on them, or their gate is opening right now. */
function openTrackPortals(view: MatchView, board: Board): Set<number> {
  const portals = new Set<number>();
  for (const player of view.players) {
    const portal = getTile(board, player.position).track?.portal;
    if (portal !== undefined) portals.add(portal);
  }
  if (view.effect?.kind === "realmEnter") {
    const { from } = view.effect;
    const track = board.tracks.find((candidate) => candidate.entries.some((entry) => entry.portal === from));
    portals.add(track?.portal ?? from);
  }
  return portals;
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
/** Where whoever Themis's verdict judges stands, for her to point at; null for anyone else. */
function judgedBy(view: MatchView, layout: BoardLayout, playerId: string): Vec3 | null {
  const verdict = view.fx.verdict;
  if (verdict?.judgeId !== playerId) return null;
  const attacker = view.players.find((player) => player.id === verdict.attackerId);
  return attacker ? layout.position(attacker.position) : null;
}

function directionBetween(layout: BoardLayout, from: number, to: number): number {
  const [x1, , z1] = layout.position(from);
  const [x2, , z2] = layout.position(to);
  return Math.atan2(z2 - z1, x2 - x1);
}

/** Logs lost/restored WebGL contexts: the canvas blanks for a moment, kept to track down screen blinks. */
function watchContext(canvas: HTMLCanvasElement): void {
  canvas.addEventListener("webglcontextlost", () =>
    console.warn(`[battle-dice] contexto WebGL perdido ${new Date().toLocaleTimeString()}`),
  );
  canvas.addEventListener("webglcontextrestored", () =>
    console.warn(`[battle-dice] contexto WebGL restaurado ${new Date().toLocaleTimeString()}`),
  );
}
