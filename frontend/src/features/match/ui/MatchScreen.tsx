"use client";

import { playerColor } from "@/features/characters";
import { EndGamePanel } from "./hud/EndGamePanel";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { preferences, usePreference } from "@/features/settings/preferences";
import { useFullscreen } from "@/lib/useFullscreen";
import { cn } from "@/lib/utils";
import { boardPresetFor, isLargeBoard, type BoardPreset } from "@/features/shared/presets/boards";
import type { MapId } from "@/features/shared/presets/maps";
import { rosterOf, type CharacterId, type RosterEntry } from "@/features/characters";
import { activePlayerOf, viewerControls, type MatchView } from "../model/matchView";
import type { MatchStore } from "../model/matchStore";
import type { Board } from "@/game/domain/types";
import { useMatch } from "../hooks/useMatch";
import { useGameAudio, type GameAudio } from "../hooks/useGameAudio";
import { useMatchAudio } from "../hooks/useMatchAudio";
import { preloadCharacterModel } from "@/features/characters/core/CharacterModel";
import { preloadChairs } from "@/features/characters/accessories/chairs";
import { CastOverlay } from "./cards/CastOverlay";
import { DrawOverlay } from "./cards/DrawOverlay";
import { FusionOverlay } from "./cards/FusionOverlay";
import { TransmuteOverlay } from "./cards/TransmuteOverlay";
import { DicePanel } from "./hud/DicePanel";
import { EffectBanner } from "./hud/EffectBanner";
import { ErrorToast } from "./hud/ErrorToast";
import { HourglassPanel, PauseOverlay } from "./hud/Hourglass";
import { LoadingCurtain } from "./hud/LoadingCurtain";
import { PlayersPanel } from "./hud/PlayersPanel";
import { BattleLog } from "./hud/BattleLog";
import { TilePicking } from "./hud/TilePicking";
import { CameraControls } from "./screen/CameraControls";
import { chairsOf, modelsOf } from "./screen/characterAssets";
import { HandColumn } from "./screen/HandColumn";
import { MatchTitleBar } from "./screen/MatchTitleBar";
import { PendingPrompts } from "./screen/PendingPrompts";
import { useAbilityUse } from "./screen/useAbilityUse";
import { useCameraChoice } from "./screen/useCameraChoice";
import { useMatchClock } from "./screen/useMatchClock";
import { withRifts } from "@/game/domain/characters/zarek/rifts";

const BoardScene = dynamic(() => import("../scene/BoardScene"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-zinc-500">Carregando arena…</div>,
});

interface MatchScreenProps {
  boardId: string;
  /** The world it's played in (see maps.ts): scenery only. */
  mapId: MapId;
  /** One player per character, in turn order (picked on /jogar); the same character may repeat. */
  characters: readonly CharacterId[];
  /** Test mode: every ability starts charged. */
  chargedAbilities: boolean;
  /** Each turn has TURN_SECONDS to think, and players may pause (see Hourglass). */
  hourglass: boolean;
  /** Dev only: the seat ("p2") this screen is pinned to, as online; null = everyone at this screen. */
  seat: string | null;
  /** Seats (0-based) the computer plays. */
  bots?: readonly number[];
}

/** A local match on the chosen board: everyone plays at this screen, taking turns. */
export function MatchScreen({
  boardId,
  mapId,
  characters,
  chargedAbilities,
  hourglass,
  seat,
  bots = [],
}: MatchScreenProps) {
  const preset = boardPresetFor(boardId);
  const [roster] = useState(() =>
    rosterOf(characters).map((entry, index) =>
      bots.includes(index) ? { ...entry, name: `${entry.name} (bot)` } : entry,
    ),
  );
  const seatId = roster.find(({ id }) => id.split(":")[0] === seat)?.id ?? null;
  const audio = useGameAudio();
  // Start fetching the models while the arena's code is still loading.
  useEffect(() => roster.flatMap(({ character }) => modelsOf(character)).forEach(preloadCharacterModel), [roster]);
  useEffect(() => preloadChairs(roster.flatMap(({ character }) => chairsOf(character))), [roster]);

  return (
    <Match
      preset={preset}
      mapId={mapId}
      roster={roster}
      chargedAbilities={chargedAbilities}
      seat={seatId}
      hourglass={hourglass}
      audio={audio}
      bots={bots}
    />
  );
}

interface MatchProps {
  preset: BoardPreset;
  mapId: MapId;
  roster: readonly RosterEntry[];
  chargedAbilities: boolean;
  seat: string | null;
  hourglass: boolean;
  audio: GameAudio;
  bots: readonly number[];
}

function Match({ preset, mapId, roster, chargedAbilities, seat, hourglass, audio, bots }: MatchProps) {
  const { store, view, replaying, watchReplay, leaveReplay, onSceneReady } = useMatch(preset.definition, roster, {
    chargedAbilities,
    seat,
    bots,
  });
  useMatchAudio(store, audio.sounds);
  if (!view || !store.board) {
    return (
      <main className="relative h-dvh w-full overflow-hidden bg-[#05060b] text-white select-none">
        <LoadingCurtain ready={false} />
      </main>
    );
  }
  return (
    <MatchTable
      // A fresh scene for the replay and again for the live match: neither carries the other's animations.
      key={replaying ? "replay" : "live"}
      store={store}
      view={view}
      plainBoard={store.board}
      preset={preset}
      mapId={mapId}
      roster={roster}
      hourglass={hourglass && !replaying}
      audio={audio}
      onReplay={watchReplay}
      onReady={onSceneReady}
    >
      {replaying && (
        <div className="pointer-events-auto absolute top-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/70 py-1.5 pr-1.5 pl-4 ring-1 ring-white/15">
          <span className="flex items-center gap-2 text-xs font-black tracking-[0.3em] text-red-400 uppercase">
            <span className="size-2 animate-pulse rounded-full bg-red-500" /> Replay
          </span>
          <button
            type="button"
            onClick={leaveReplay}
            className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wider text-white uppercase hover:bg-white/20"
          >
            Sair do replay
          </button>
        </div>
      )}
    </MatchTable>
  );
}

export interface MatchTableProps extends Omit<MatchProps, "chargedAbilities" | "seat" | "bots"> {
  store: MatchStore;
  view: MatchView;
  /** The board without the Void's rifts, as the snapshot brought it. */
  plainBoard: Board;
  /** "Jogar novamente" when this screen restarts the match itself (the party TV hosts it); else store.restart. */
  onRestart?: () => void;
  /** "Assistir replay" on the end-of-match screen, when this screen can replay the match. */
  onReplay?: () => void;
  /** Called once the scene has loaded and the curtain lifts (the computer players wait for it). */
  onReady?: () => void;
  /** Extra classes for the screen (the party TV scales its HUD up). */
  className?: string;
  /** Overlays drawn above the HUD (the party TV's turn and presence notes). */
  children?: ReactNode;
}

/** The match on screen for any store: hot-seat, a pinned seat or a spectator (see viewerControls). */
export function MatchTable({
  store,
  view,
  plainBoard,
  preset,
  mapId,
  roster,
  hourglass,
  audio,
  onRestart,
  onReplay,
  onReady: onSceneReady,
  className,
  children,
}: MatchTableProps) {
  const quality = usePreference(preferences.effectsQuality);
  const { sounds } = audio;
  const { fullscreen, toggle: toggleFullscreen } = useFullscreen();
  const canFollow = isLargeBoard(preset);
  const { framing, pickFraming, freeLook, onFreeLook, follow } = useCameraChoice(view.activePlayerId);
  const models = useMemo(() => [...new Set(roster.flatMap(({ character }) => modelsOf(character)))], [roster]);
  /** The scene has loaded and compiled everything: the curtain lifts. */
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => {
    setReady(true);
    onSceneReady?.();
  }, [onSceneReady]);
  const nameOf = (id: string | null) => view.players.find((player) => player.id === id)?.name ?? null;
  const activePlayer = activePlayerOf(view);
  const controls = viewerControls(view, store.pinnedSeat, store.spectator, store.computerSeats);
  const viewer = view.players.find((player) => player.id === controls.viewerId);
  // The path as it stands, with the rifts Zarek's Void opened (the store's board is the plain one).
  const board = useMemo(() => withRifts(plainBoard, view.rifts), [plainBoard, view.rifts]);
  const {
    choosing,
    AbilityPicker,
    abilityCtx,
    activateAbility,
    releaseVoidItem,
    placement,
    picking,
    picked,
    undoPick,
    stopPlacing,
  } = useAbilityUse(store, view, controls, board, activePlayer);
  const { seconds, clockRunning, pausedBy, pausesLeft, pause, resume } = useMatchClock(
    store,
    view,
    controls,
    hourglass,
    ready,
  );

  return (
    <main className={cn("relative h-dvh w-full overflow-hidden bg-[#05060b] text-white select-none", className)}>
      <div className="absolute inset-0">
        <BoardScene
          board={plainBoard}
          columns={preset.columns}
          mapId={mapId}
          view={view}
          cameraFraming={canFollow ? framing : "board"}
          onDiceImpact={sounds.diceLand}
          quality={quality}
          viewerId={controls.viewerId}
          models={models}
          onReady={onReady}
          freeLook={freeLook}
          onFreeLook={onFreeLook}
          picking={picking}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6">
        <header className="hud-scroll flex max-h-[calc(100%-5.5rem)] min-h-0 flex-col items-start gap-3 overflow-y-auto">
          <MatchTitleBar preset={preset} audio={audio} fullscreen={fullscreen} toggleFullscreen={toggleFullscreen} />
          {/* A pinned seat sees no sand on someone else's turn: only the active screen counts down. */}
          {hourglass && view.winnerId === null && controls.ownsTurn && (
            <HourglassPanel
              seconds={seconds}
              running={clockRunning}
              pausesLeft={pausesLeft(view.activePlayerId)}
              onPause={pause}
            />
          )}
          {/* Beside the board on the left, so the right column stays free for the hand. */}
          {view.players.length > 1 && (
            <div className="pointer-events-auto max-sm:hidden">
              <PlayersPanel
                players={view.players}
                activePlayerId={view.activePlayerId}
                viewerId={controls.viewerId}
                board={board}
              />
            </div>
          )}
          <div className="pointer-events-auto max-sm:hidden">
            <BattleLog log={view.log} players={view.players} />
          </div>
        </header>

        <div className="absolute inset-x-0 top-24 flex justify-center px-4 sm:top-6">
          <ErrorToast error={view.error} />
        </div>

        {/* Pinned a third of the way down, clear of the dice panel: in the flow, the tall players panel pushed it to the bottom. */}
        <div className="absolute inset-x-0 top-[30%] z-30 flex justify-center px-4">
          <EffectBanner effect={view.effect} winnerName={nameOf(view.winnerId)} nameOf={nameOf} />
        </div>

        <HandColumn
          store={store}
          view={view}
          controls={controls}
          board={board}
          player={viewer}
          onActivateAbility={activateAbility}
          onReleaseVoidItem={releaseVoidItem}
        />

        {/* Pinned to the bottom, so a tall left column (eight players and the log) never pushes the roll off screen. */}
        <footer className="absolute inset-x-4 bottom-4 flex items-end justify-center sm:inset-x-6 sm:bottom-6">
          <CameraControls
            canFollow={canFollow}
            framing={framing}
            freeLook={freeLook}
            onPickFraming={pickFraming}
            onFollow={follow}
          />
          <div className="pointer-events-auto w-full max-w-sm">
            <DicePanel
              activePlayerName={nameOf(view.activePlayerId) ?? ""}
              waitingName={nameOf(controls.waitingFor)}
              lastRoll={view.lastRoll}
              isRolling={view.isRolling}
              isAnimating={view.isAnimating}
              isFinished={view.winnerId !== null}
              onRoll={store.rollDice}
              onRestart={onRestart ?? store.restart}
            />
          </div>
        </footer>
      </div>

      {view.winnerId !== null && !view.isAnimating && (
        <EndGamePanel
          key={view.winnerId}
          stats={view.stats}
          players={view.players}
          winnerId={view.winnerId}
          colorOf={playerColor}
          onRestart={store.spectator && !onRestart ? undefined : (onRestart ?? store.restart)}
          onReplay={onReplay}
        />
      )}
      <CastOverlay cast={view.fx.cast} />
      <DrawOverlay drawing={view.fx.drawing} />
      <FusionOverlay fusing={view.fx.fusing} />
      <TransmuteOverlay transmuting={view.fx.transmuting} />
      {choosing && abilityCtx && controls.canActivateAbility && AbilityPicker && <AbilityPicker ctx={abilityCtx} />}
      {placement && (
        <TilePicking
          title={placement.title}
          tone={placement.tone}
          steps={placement.steps}
          picked={picked}
          short={placement.tiles.length < placement.steps.length}
          confirmLabel={placement.confirmLabel}
          onUndo={undoPick}
          onCancel={stopPlacing}
          onConfirm={() => {
            placement.send(store, picked);
            stopPlacing();
          }}
        />
      )}
      <PendingPrompts store={store} view={view} controls={controls} nameOf={nameOf} />
      {children}
      <LoadingCurtain ready={ready} />
      {pausedBy !== null && (
        <PauseOverlay name={nameOf(pausedBy) ?? ""} pausesLeft={pausesLeft(pausedBy)} onResume={resume} />
      )}
    </main>
  );
}
