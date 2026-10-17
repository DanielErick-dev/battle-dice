"use client";

import { Preload } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import { Vector3 } from "three";
import { getTile } from "@/game/domain/board";
import { isSeated } from "@/game/domain/players";
import { DICE_SIDES } from "@/game/domain/dice";
import type { Board, Player, PlayerId, RealmKind, TileId } from "@/game/domain/types";
import { characterFor, playerColor } from "../characters";
import type { EffectsQuality } from "../config";
import type { MatchView } from "../model/matchView";
import { boardScaleFor, CameraRig, type CameraFraming } from "./CameraRig";
import { SceneWarmup } from "./SceneWarmup";
import {
  createBoardLayout,
  tileOffsetFor,
  TILE_HEIGHT,
  TILE_PITCH,
  TILE_SIZE,
  type BoardLayout,
  type Vec3,
} from "./boardLayout";
import { ArenaEnvironment, HORIZON_COLOR } from "./environment/ArenaEnvironment";
import { ArcaneBeam } from "./CardEffects";
import { EFFECT_SCALE, FIGURE_HEIGHT, LEVITATE_HEIGHT } from "./character/figure";
import { HellHand } from "./character/HellHand";
import { isFallen } from "@/game/domain/seraph";
import { ArrowVolley, PinnedTrapMark } from "./character/ArrowRain";
import { FrostStream } from "./character/FrostStream";
import { PickedTileMark } from "./character/PickedTileMark";
import { SealScroll } from "./character/SealScroll";
import { BlackFlameMark, EnchantedTileMark } from "./character/TileSpells";
import { WinterIce } from "./character/WinterIce";
import { SpecterFigure } from "./character/SpecterFigure";
import { SEAL_TEXT, SPECTER_TEXT } from "../ui/placementText";
import { LightningDash } from "./character/LightningDash";
import { TidalWave } from "./character/TidalWave";
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
import type { PickCursor } from "./pickCursor";
import { pathColor } from "./tileTheme";
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
  /** Where each fairy's wand tip is, filled by her wand every frame: her snow streams from there. */
  const playerIds = view.players.map((player) => player.id).join(",");
  const wandTips = useMemo(
    () => new Map(playerIds.split(",").map((id) => [id as PlayerId, new Vector3()])),
    [playerIds],
  );
  const occupiedTiles = new Set(view.players.map((player) => player.position));
  const mainTiles = useMemo(() => board.tiles.filter((tile) => !tile.track), [board]);
  const trapZoneTiles = useMemo(() => new Set(board.trapZones.flatMap((zone) => zone.tiles)), [board]);
  // Snowed-over and burning tiles hide what stands on them under the spell.
  const coveredTiles = useMemo(
    () => new Set([...view.enchantedTiles, ...view.blackFlames].map(({ tile }) => tile)),
    [view.enchantedTiles, view.blackFlames],
  );
  const dash = view.dash;
  const dashPath = useMemo(() => dash?.path.map((tile) => layout.position(tile)) ?? [], [dash?.path, layout]);
  const tide = view.tide;
  const tidePath = useMemo(() => tide?.path.map((tile) => layout.position(tile)) ?? [], [tide?.path, layout]);
  /** The top of the tile Hell's Drag comes up through. */
  const [dragX, dragY, dragZ] = view.drag ? layout.position(view.drag.from) : [0, 0, 0];
  const dragGround: Vec3 = [dragX, dragY + TILE_HEIGHT / 2, dragZ];
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
  // Spells on a realm's tiles (the fairy's snow in hell…) go with its track: gone while it's sunk away.
  // Eternal Winter's ice, on the main path up to its frontier (snow and black fire keep their own look).
  const frozenPositions = useMemo(() => {
    if (!view.winter) return [];
    const covered = new Set([...view.enchantedTiles, ...view.blackFlames].map(({ tile }) => tile));
    const tiles = [];
    for (let tile = board.startTile + 1; tile <= view.winter.frontier; tile++) {
      if (!covered.has(tile)) tiles.push(layout.position(tile));
    }
    return tiles;
  }, [view.winter, view.enchantedTiles, view.blackFlames, board, layout]);
  const shown = (tile: number) => {
    const portal = getTile(board, tile).track?.portal;
    return portal === undefined || openTracks.has(portal);
  };
  const focusRealm = realmAt(board, focusTile(view));
  const gate = view.effect?.kind === "realmEnter" ? view.effect : null;

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
          {/* Pools of particles in world space, fed by emitters on the tokens. */}
          <HealingParticles />
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
          {gate?.realm && (
            <RealmGate key={`gate${effectKey(gate)}`} realm={gate.realm} position={layout.position(gate.from)} />
          )}
          {view.destroyedTraps.filter(shown).map((tile) => (
            <SmashedTrapMark
              key={`smashed${tile}`}
              tile={tile}
              position={layout.position(tile)}
              color={SMASHED_TRAP_COLOR}
            />
          ))}
          {view.pinnedTraps.filter(shown).map((tile) => (
            <PinnedTrapMark key={`pinned${tile}`} position={layout.position(tile)} color={PINNED_TRAP_COLOR} />
          ))}
          {view.enchantedTiles
            .filter(({ tile }) => shown(tile))
            .map(({ tile, owner }) => (
              <EnchantedTileMark key={`enchanted${tile}`} position={layout.position(tile)} color={playerColor(owner)} />
            ))}
          <WinterIce positions={frozenPositions} />
          {view.blackFlames
            .filter(({ tile }) => shown(tile))
            .map(({ tile, owner }) => (
              <BlackFlameMark key={`flame${tile}`} position={layout.position(tile)} color={playerColor(owner)} />
            ))}
          {view.specters
            .filter((specter) => shown(specter.tile))
            .map((specter) => {
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
          {view.seals
            .filter((seal) => shown(seal.tile))
            .map((seal) => (
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
          {tide && <TidalWave key={`tide${tide.id}`} path={tidePath} color={playerColor(tide.playerId)} />}
          {view.drag && (
            <group key={`drag${view.drag.id}`} position={dragGround} scale={EFFECT_SCALE}>
              <HellHand groundY={dragGround[1]} />
            </group>
          )}
          {view.frostStream && (
            <FrostStream
              key={`frost${view.frostStream.id}`}
              from={streamStart(view, layout, wandTips.get(view.frostStream.playerId), view.frostStream.playerId)}
              to={layout.position(view.frostStream.tile)}
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
              model={modelOf(player)}
              fallen={isFallen(player) && !characterFor(player.id)?.fallenModel}
              fell={
                view.effect?.kind === "fallen" && view.effect.playerId === player.id ? effectKey(view.effect) : null
              }
              dragged={
                view.drag?.targetId === player.id && view.drag.phase !== "over"
                  ? { id: view.drag.id, phase: view.drag.phase }
                  : view.drag?.targetId === player.id && view.effect?.kind === "dragged"
                    ? { id: view.drag.id, phase: "over" }
                    : null
              }
              energyBlades={characterFor(player.id)?.energyBlades ?? false}
              limbLightning={characterFor(player.id)?.limbLightning ?? false}
              castsStill={characterFor(player.id)?.castsStill}
              landImpactSeconds={characterFor(player.id)?.landImpactSeconds}
              castImpactSeconds={characterFor(player.id)?.castImpactSeconds ?? null}
              handProp={characterFor(player.id)?.handProp}
              wand={characterFor(player.id)?.wand}
              wandTip={characterFor(player.id)?.wand ? wandTips.get(player.id) : undefined}
              // Seraphiel's burnt wings and ashen throne once he has fallen.
              wings={isFallen(player) ? characterFor(player.id)?.fallenWings : characterFor(player.id)?.wings}
              chair={isFallen(player) ? characterFor(player.id)?.fallenChair : characterFor(player.id)?.chair}
              castPropSeconds={characterFor(player.id)?.castPropSeconds}
              target={trampleTarget(player.id, view, board, layout) ?? tokenTarget(player, view.players, layout)}
              pathDirection={pathDirection(board, layout, player.position)}
              // Thrown back by a Susanoo, they fly the tile back.
              isTeleporting={
                (isTeleport(view.effect) && view.effect?.playerId === player.id) ||
                (view.trample?.susanoo === true && view.trample.victim === player.id && view.trample.phase === "flying")
              }
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
              // Stuck in snow or in heaven's chains, they wait standing (see isSeated).
              // Trampled, they get up off their chair to be shoved.
              isResting={isSeated(player) && !(view.trample?.victim === player.id && view.trample.phase !== "over")}
              isChained={player.chained > 0}
              isArmoured={player.spectralArmour > 0}
              isUntamed={player.untamed > 0}
              shove={
                view.trample?.by === player.id &&
                !view.trample.susanoo &&
                (view.trample.phase === "shove" || view.trample.phase === "flying")
                  ? view.trample.id
                  : null
              }
              shoveImpactSeconds={characterFor(player.id)?.shoveImpactSeconds}
              castAura={characterFor(player.id)?.castAura}
              armourLook={characterFor(player.id)?.armourLook}
              snowbound={player.snowbound?.rounds ?? 0}
              hop={
                view.effect?.kind === "enchanted" &&
                view.effect.playerId === player.id &&
                view.effect.enchanted?.owner === player.id
                  ? effectKey(view.effect)
                  : null
              }
              hopTakeoffSeconds={characterFor(player.id)?.hopTakeoffSeconds}
              knocked={view.trample?.victim === player.id && view.trample.phase === "flying" ? view.trample.id : null}
              diceBoost={player.diceBoost}
              diceBonuses={player.diceBonuses}
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
  // Hell's Drag is watched where the hand comes up.
  if (view.drag && view.drag.phase !== "over") return view.drag.from;
  const id = view.movingPlayerId ?? view.activePlayerId;
  return view.players.find((candidate) => candidate.id === id)?.position ?? null;
}

function focusPoint(view: MatchView, layout: BoardLayout): Vec3 {
  // The fairy's snow is followed to each tile it enchants.
  if (view.frostStream) return layout.position(view.frostStream.tile);
  // Cronos bending an opponent's time: watched on them.
  if (view.effect?.kind === "timeBent") return layout.position(view.effect.from);
  // A rolling tide is watched from halfway along its reach.
  if (view.tide?.rolling) return layout.position(view.tide.path[Math.floor(view.tide.path.length / 2)]);
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
  if (view.effect?.kind === "realmEnter") {
    const { from } = view.effect;
    const track = board.tracks.find((candidate) => candidate.entries.some((entry) => entry.portal === from));
    portals.add(track?.portal ?? from);
  }
  return portals;
}

/** Where the fairy's snow leaves from: her wand's tip, or above her head if it's never been seen. */
function streamStart(view: MatchView, layout: BoardLayout, tip: Vector3 | undefined, playerId: PlayerId): Vector3 {
  if (tip && tip.lengthSq() > 0) return tip;
  const tile = view.players.find((player) => player.id === playerId)?.position ?? 0;
  const [x, y, z] = layout.position(tile);
  return new Vector3(x, y + FIGURE_HEIGHT * 0.8, z);
}

/** A fresh key per effect shown (a gate opening, a trap springing), so each one plays from the start. */
const effectKeys = new WeakMap<object, number>();
let nextEffectKey = 0;
function effectKey(effect: object): number {
  if (!effectKeys.has(effect)) effectKeys.set(effect, nextEffectKey++);
  return effectKeys.get(effect)!;
}

/** The model a player's figure shows: Seraphiel's fallen form once he has fallen, when it's been made. */
function modelOf(player: Player): string | null {
  const character = characterFor(player.id);
  if (!character) return null;
  return isFallen(player) && character.fallenModel ? character.fallenModel : character.model;
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
    effect?.kind === "realmEnter" ||
    effect?.kind === "trampled"
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

/** How far ahead of the one he trampled the Berserker stands to shove them, face to face. */
const SHOVE_GAP = TILE_SIZE * 0.45;

/**
 * Where a trample puts the two figures (null for anyone else): the one trampled in the middle of the
 * tile until they're sent flying, the Berserker just ahead of them along the path until he runs on.
 */
function trampleTarget(playerId: string, view: MatchView, board: Board, layout: BoardLayout): Vec3 | null {
  const trample = view.trample;
  if (
    !trample ||
    trample.susanoo ||
    (playerId !== trample.by && (playerId !== trample.victim || trample.phase !== "shove"))
  )
    return null;
  const [x, y, z] = layout.position(trample.tile);
  if (playerId === trample.victim) return [x, y, z];
  const [dx, , dz] = pathDirection(board, layout, trample.tile);
  const length = Math.hypot(dx, dz) || 1;
  return [x + (dx / length) * SHOVE_GAP, y, z + (dz / length) * SHOVE_GAP];
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
