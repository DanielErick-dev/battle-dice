"use client";

import { Preload } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import { getTile } from "@/game/domain/board";
import { DICE_SIDES } from "@/game/domain/dice";
import type { Board, Player, PlayerId, RealmKind, TileId } from "@/game/domain/types";
import { characterFor, playerColor } from "../characters";
import type { EffectsQuality } from "../config";
import type { MatchView } from "../model/matchView";
import { boardScaleFor, CameraRig, type CameraFraming } from "./CameraRig";
import { SceneWarmup } from "./SceneWarmup";
import { createBoardLayout, tileOffsetFor, TILE_PITCH, type BoardLayout, type Vec3 } from "./boardLayout";
import { ArenaEnvironment, HORIZON_COLOR } from "./environment/ArenaEnvironment";
import { ArcaneBeam } from "./CardEffects";
import { LEVITATE_HEIGHT } from "./character/figure";
import { ArrowVolley, PinnedTrapMark } from "./character/ArrowRain";
import { PickedTileMark } from "./character/PickedTileMark";
import { SealScroll } from "./character/SealScroll";
import { BlackFlameMark, EnchantedTileMark } from "./character/TileSpells";
import { SpecterFigure } from "./character/SpecterFigure";
import { SEAL_TEXT, SPECTER_TEXT } from "../ui/placementText";
import { LightningDash } from "./character/LightningDash";
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

/** Tiles being picked for an ability, right on the board (see TilePicking). */
export interface BoardPicking {
  /** The tiles that can be picked: they breathe and take clicks. */
  tiles: ReadonlySet<TileId>;
  /** Those picked so far, each marked with its tag in its colour. */
  picked: readonly { tile: TileId; tag: string; color: string }[];
  onPick: (tile: TileId) => void;
}

interface BoardSceneProps {
  board: Board;
  columns: number;
  view: MatchView;
  /** How the camera frames the play (following the action matters on boards too big to frame whole). */
  cameraFraming: CameraFraming;
  /** The 3D die hit the ground; strength is 1 for the first impact and smaller after. */
  onDiceImpact: (strength: number) => void;
  /** "low" also renders at 1× pixel density, on top of lighter screen effects. */
  quality: EffectsQuality;
  /**
   * The player watching this screen: they see what their own seals and apparitions are, while
   * everyone else's look alike (apparitions just like their Warden). Null shows no secrets.
   */
  viewerId: PlayerId | null;
  /** Every character model in the match: the scene waits for them all before it shows. */
  models: readonly string[];
  /** Everything has loaded and been compiled on the GPU: the match can start. */
  onReady: () => void;
  /** The viewer is looking around on their own: the camera follows nobody (see CameraRig). */
  freeLook: boolean;
  /** Tiles being picked for an ability, or null. */
  picking: BoardPicking | null;
  onFreeLook: () => void;
}

/** Above this many tiles, face textures drop to half resolution to save GPU memory. */
const HIGH_RES_TILE_LIMIT = 50;
/** Glow in the cracks of a trap the Trap Ward smashed (the void violet of its wielder). */
const SMASHED_TRAP_COLOR = "#8b5cf6";
/** Glow of the arrows pinning a trap down (the leaf green of the archer who shot them). */
const PINNED_TRAP_COLOR = "#84cc16";

export default function BoardScene({
  board,
  columns,
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
  const layout = useMemo(() => createBoardLayout(board, columns), [board, columns]);
  const mainTiles = useMemo(() => board.tiles.filter((tile) => !tile.track), [board]);
  const trapZoneTiles = useMemo(() => new Set(board.trapZones.flatMap((zone) => zone.tiles)), [board]);
  // Snowed-over and burning tiles hide what stands on them under the spell.
  const coveredTiles = useMemo(
    () => new Set([...view.enchantedTiles, ...view.blackFlames].map(({ tile }) => tile)),
    [view.enchantedTiles, view.blackFlames],
  );
  const dash = view.dash;
  const dashPath = useMemo(() => dash?.path.map((tile) => layout.position(tile)) ?? [], [dash?.path, layout]);
  const volley = view.volley;
  const volleyTargets = useMemo(
    () => volley?.targets.map((tile) => layout.position(tile)) ?? [],
    [volley?.targets, layout],
  );
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
    <Canvas
      shadows="percentage"
      dpr={quality === "high" ? [1, 2] : 1}
      camera={{ fov: 40 }}
      gl={{ antialias: false }}
      onCreated={({ gl }) => watchContext(gl.domElement)}
    >
      <color attach="background" args={[HORIZON_COLOR]} />
      <fog attach="fog" args={[HORIZON_COLOR, 30 * scale, 85 * scale]} />

      {/* Nothing shows until every model has loaded; then it's all compiled before the match starts. */}
      <Suspense fallback={null}>
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
              covered={coveredTiles.has(tile.id)}
              onPick={picking?.tiles.has(tile.id) ? picking.onPick : undefined}
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
              textureSize={textureSize}
            />
          ))}
          {gate?.realm && (
            <RealmGate key={`gate${effectKey(gate)}`} realm={gate.realm} position={layout.position(gate.from)} />
          )}
          {view.destroyedTraps.map((tile) => (
            <SmashedTrapMark
              key={`smashed${tile}`}
              tile={tile}
              position={layout.position(tile)}
              color={SMASHED_TRAP_COLOR}
            />
          ))}
          {view.pinnedTraps.map((tile) => (
            <PinnedTrapMark key={`pinned${tile}`} position={layout.position(tile)} color={PINNED_TRAP_COLOR} />
          ))}
          {view.enchantedTiles.map(({ tile, owner }) => (
            <EnchantedTileMark key={`enchanted${tile}`} position={layout.position(tile)} color={playerColor(owner)} />
          ))}
          {view.blackFlames.map(({ tile, owner }) => (
            <BlackFlameMark key={`flame${tile}`} position={layout.position(tile)} color={playerColor(owner)} />
          ))}
          {view.specters.map((specter) => {
            const warden = characterFor(specter.owner);
            return warden ? (
              <SpecterFigure
                key={`${specter.owner}:${specter.tile}`}
                model={warden.model}
                position={layout.position(specter.tile)}
                color={warden.color}
                disguised={specter.owner !== viewerId}
                facing={headingAlong(pathDirection(board, layout, specter.tile))}
                label={specter.owner === viewerId ? SPECTER_TEXT[specter.kind].name : undefined}
              />
            ) : null;
          })}
          {view.seals.map((seal) => (
            <SealScroll
              key={`${seal.owner}:${seal.tile}`}
              position={layout.position(seal.tile)}
              color={playerColor(seal.owner)}
              label={seal.owner === viewerId ? SEAL_TEXT[seal.kind].name : undefined}
            />
          ))}
          {volley && (
            <ArrowVolley
              key={`volley${volley.id}`}
              from={layout.position(volley.from)}
              targets={volleyTargets}
              color={playerColor(volley.playerId)}
            />
          )}
          {dash && <LightningDash key={`dash${dash.id}`} path={dashPath} color={playerColor(dash.playerId)} />}
          {view.effect?.kind === "hiddenTrap" && (
            <HiddenTrapBurst key={`hidden${effectKey(view.effect)}`} position={layout.position(view.effect.from)} />
          )}

          {view.players.map((player, seat) => (
            <PlayerToken
              key={player.id}
              nameTag={
                view.players.length > 1 ? { text: `J${seat + 1} ${player.name.split(" ")[0]}`, seat } : undefined
              }
              color={playerColor(player.id)}
              model={characterFor(player.id)?.model ?? null}
              energyBlades={characterFor(player.id)?.energyBlades ?? false}
              limbLightning={characterFor(player.id)?.limbLightning ?? false}
              castsStill={characterFor(player.id)?.castsStill}
              landImpactSeconds={characterFor(player.id)?.landImpactSeconds}
              castImpactSeconds={characterFor(player.id)?.castImpactSeconds ?? null}
              handProp={characterFor(player.id)?.handProp}
              castPropSeconds={characterFor(player.id)?.castPropSeconds}
              target={tokenTarget(player, view.players, layout)}
              pathDirection={pathDirection(board, layout, player.position)}
              isTeleporting={isTeleport(view.effect) && view.effect?.playerId === player.id}
              isDashing={dash?.playerId === player.id && !dash.arrived}
              isFuryAwake={
                view.abilityInUse === "dormantFury" &&
                view.activePlayerId === player.id &&
                !(dash?.playerId === player.id && !dash.arrived)
              }
              isActive={view.activePlayerId === player.id}
              isPowered={view.poweredPlayerId === player.id}
              isShielded={player.shielded}
              shieldColor={characterFor(player.id)?.shieldColor}
              isLevitating={player.levitating > 0}
              isArmoured={player.spectralArmour > 0}
              diceBoost={player.diceBoost}
              diceBonus={player.diceBonus}
              cast={view.cast?.playerId === player.id ? view.cast : null}
              abilityCast={
                view.effect?.kind === "abilityUsed" && view.effect.playerId === player.id
                  ? effectKey(view.effect)
                  : null
              }
            />
          ))}

          {view.cast?.card.cardId === "arcaneBlast" && view.cast.targetId && (
            <ArcaneBeam
              key={`beam${view.cast.id}`}
              from={tokenPosition(view, layout, view.cast.playerId)}
              to={tokenPosition(view, layout, view.cast.targetId)}
            />
          )}

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
            cast={view.cast}
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

/** The angle round the vertical a figure faces when looking along `direction` (0 = +z), as tokens do. */
function headingAlong([x, , z]: Vec3): number {
  return Math.hypot(x, z) < 1e-4 ? 0 : Math.atan2(x, z);
}

function tokenTarget(player: Player, players: readonly Player[], layout: BoardLayout): Vec3 {
  const [x, y, z] = layout.position(player.position);
  const [dx, , dz] = tileOffsetFor(player, players);
  return [x + dx, y, z + dz];
}

/**
 * Logs when the browser takes the WebGL context away (and gives it back): the whole canvas blanks
 * for a moment, which shows as the screen blinking. Kept to track down those blinks.
 */
function watchContext(canvas: HTMLCanvasElement): void {
  canvas.addEventListener("webglcontextlost", () =>
    console.warn(`[battle-dice] contexto WebGL perdido ${new Date().toLocaleTimeString()}`),
  );
  canvas.addEventListener("webglcontextrestored", () =>
    console.warn(`[battle-dice] contexto WebGL restaurado ${new Date().toLocaleTimeString()}`),
  );
}
