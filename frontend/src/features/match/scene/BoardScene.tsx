"use client";

import { PerformanceMonitor, Preload } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo, useState } from "react";
import { Vector3 } from "three";
import { getTile } from "@/game/domain/board/board";
import { withRifts } from "@/game/domain/characters/zarek/rifts";
import { frozenTiles } from "@/game/domain/characters/fairy/winter";
import type { Board, PlayerId } from "@/game/domain/types";
import { characterFor, characterIdFor, playerColor } from "@/features/characters";
import type { EffectsQuality } from "@/features/shared/config";
import type { MatchView } from "../model/matchView";
import { createBoardLayout, withRiftPositions } from "@/features/shared/board/boardLayout";
import { boardScaleFor, CameraRig, type CameraFraming } from "./camera/CameraRig";
import { cameraSpotlight, fireChase, voidChase } from "./camera/cameraCues";
import { diceLanding, dieRoll, focusPoint, focusTile, realmAt } from "./camera/cameraFocus";
import { PickedTileMark } from "@/features/characters/shared/PickedTileMark";
import { DiceThrow } from "./board/DiceThrow";
import { BOARD_EFFECTS, OVERLAY_EFFECTS, type BoardFx } from "./effects";
import { ArenaEnvironment, HORIZON_COLOR } from "./environment/ArenaEnvironment";
import type { MapId } from "@/features/shared/presets/maps";
import type { BoardPicking } from "./board/pickCursor";
import { PlayerToken } from "./token/PlayerToken";
import { PostEffects } from "./PostEffects";
import { RealmAtmosphere } from "./realm/RealmAtmosphere";
import { RealmTrackView } from "./realm/RealmTrackView";
import { SceneWarmup } from "./SceneWarmup";
import { directionBetween, openTrackPortals, reachableTiles } from "./board/boardState";
import { TileLinks } from "./board/TileLinks";
import { TileMesh } from "./board/tile/TileMesh";
import { pathColor } from "./board/tile/theme/pathColor";
import { themeFor } from "./board/tile/theme/tileTheme";
import { showsRune, TileNumbers } from "./board/tile/TileNumber";
import { SQUARE_SLAB } from "@/features/shared/board/slab";
import { SceneLights } from "./SceneLights";
import { fireStatus, judgedBy, tileSeat } from "./token/tokenCues";
import { pathDirection, tokenTarget } from "./token/tokenPlacement";
import { tokenSignals } from "./token/tokenSignals";
import { HealingParticles } from "./vfx/healing";
import { watchContext } from "./watchContext";

/** Tiles being picked for an ability, right on the board (see TilePicking). */
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
  // Shortcut portals (no realm) come out on these tiles.
  const warpExits = useMemo(
    () => new Set(board.tiles.flatMap(({ effect }) => (effect.kind === "portal" && !effect.realm ? [effect.to] : []))),
    [board],
  );
  // Who plays, as a stable list: the island's landmarks follow it.
  const characters = useMemo(
    () =>
      playerIds
        .split(",")
        .map(characterIdFor)
        .filter((id) => id !== null),
    [playerIds],
  );
  const wandTips = useMemo(() => new Map(playerIds.split(",").map((id) => [id, new Vector3()])), [playerIds]);
  // Only where someone has stopped: a tile walked over on the way (spikes, a chest) stays as it was.
  const passing = (player: (typeof view.players)[number]) =>
    view.walkEnd?.playerId === player.id && view.walkEnd.tile !== player.position;
  const occupiedTiles = new Set(
    view.players.filter((player) => !passing(player) && !player.voidBound).map((player) => player.position),
  );
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
  // The island's tiles show their numbers on plaques by the road, all drawn at once (see TileNumbers).
  const destroyedKey = view.destroyedTraps.join(",");
  const numberPlaques = useMemo(
    () =>
      mainTiles.map((tile) => {
        const accent = tile.rift ? RIFT_ACCENT : pathColor((tile.id - 1) / (board.finishTile - 1));
        const theme = themeFor(tile, {
          inTrapZone: trapZoneTiles.has(tile.id),
          destroyed: destroyedKey.split(",").includes(String(tile.id)),
        });
        return {
          text: theme.badge ?? String(tile.id),
          rune: showsRune(tile, theme) ? theme : undefined,
          accent: theme.kind === "regular" ? accent : theme.glow,
          position: layout.position(tile.id),
          outline: layout.slab(tile.id)?.outline ?? SQUARE_SLAB,
        };
      }),
    [mainTiles, board.finishTile, trapZoneTiles, destroyedKey, layout],
  );
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

  // Sustained low frame rate (a hot laptop GPU, a weak phone): drop to plain resolution and cheap antialiasing.
  const [strained, setStrained] = useState(false);
  const effectsQuality: EffectsQuality = strained ? "low" : quality;

  // Antialiasing happens in the effect composer (multisampling), not on the canvas.
  return (
    <Canvas
      shadows="percentage"
      // Capped at 1.5×: at 2× a big screen renders ~4× the pixels for little visible gain, and the GPU overheats.
      dpr={effectsQuality === "high" ? [1, 1.5] : 1}
      camera={{ fov: 40 }}
      gl={{ antialias: false }}
      onCreated={({ gl }) => {
        watchContext(gl.domElement);
        // Dev only: lets the console read gl.info (geometries, textures, programs) while hunting slowdowns.
        if (process.env.NODE_ENV !== "production") Object.assign(window, { __battleDiceGl: gl });
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
          <SceneLights scale={scale} shadowExtent={shadowExtent} />

          <ArenaEnvironment layout={roadLayout} scale={scale} mapId={mapId} characters={characters} />
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
              mossy={mapId === "island"}
              warpExit={warpExits.has(tile.id)}
            />
          ))}
          {mapId === "island" && <TileNumbers plaques={numberPlaques} />}
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

          {/* Each token apart too: a chair or prop loading the first time it's needed hides only that figure. */}
          {view.players.map((player, seat) => (
            <Suspense key={player.id} fallback={null}>
              <PlayerToken
                player={player}
                character={characterFor(player.id)}
                nameTag={
                  view.players.length > 1
                    ? {
                        text: `J${seat + 1} ${player.name.split(" ")[0]}${fireStatus(player)}`,
                        seat: tileSeat(view.players, seat),
                      }
                    : undefined
                }
                color={playerColor(player.id)}
                target={tokenTarget(player, view, board, layout)}
                pathDirection={pathDirection(board, layout, player.position)}
                signals={tokenSignals(view, player)}
                wandTip={wandTips.get(player.id)}
                faceToward={judgedBy(view, layout, player.id)}
              />
            </Suspense>
          ))}
          {OVERLAY_EFFECTS.map((Effect, index) => (
            <Suspense key={index} fallback={null}>
              <Effect fx={fx} />
            </Suspense>
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
            spotlight={cameraSpotlight(view, board, layout)}
            chase={voidChase(view) ?? fireChase(view)}
          />
        </RealmAtmosphere>
        <Preload all />
        <SceneWarmup models={models} onReady={onReady} />
      </Suspense>
      <PerformanceMonitor onDecline={() => setStrained(true)} flipflops={1} />
      <PostEffects quality={effectsQuality} />
    </Canvas>
  );
}
