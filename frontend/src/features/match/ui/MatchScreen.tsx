"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { preferences, usePreference } from "@/features/settings/preferences";
import { useFullscreen } from "@/lib/useFullscreen";
import { boardPresetFor, isLargeBoard, type BoardPreset } from "../boards";
import type { MapId } from "../maps";
import { rosterOf, type CharacterId, type RosterEntry } from "@/features/characters";
import { activePlayerOf, canActivateAbility } from "../model/matchView";
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
import { withRifts } from "@/game/domain/characters/zarek/void";

const BoardScene = dynamic(() => import("../scene/BoardScene"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-zinc-500">Carregando arena…</div>,
});

export interface MatchScreenProps {
  boardId: string;
  /** The world it's played in (see maps.ts): scenery only. */
  mapId: MapId;
  /** One player per character, in turn order (picked on /jogar); the same character may repeat. */
  characters: readonly CharacterId[];
  /** Test mode: every ability starts charged. */
  chargedAbilities: boolean;
  /** Each turn has TURN_SECONDS to think, and players may pause (see Hourglass). */
  hourglass: boolean;
}

/** A local match on the chosen board: everyone plays at this screen, taking turns. */
export function MatchScreen({ boardId, mapId, characters, chargedAbilities, hourglass }: MatchScreenProps) {
  const preset = boardPresetFor(boardId);
  const [roster] = useState(() => rosterOf(characters));
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
      hourglass={hourglass}
      audio={audio}
    />
  );
}

interface MatchProps {
  preset: BoardPreset;
  mapId: MapId;
  roster: readonly RosterEntry[];
  chargedAbilities: boolean;
  hourglass: boolean;
  audio: GameAudio;
}

function Match({ preset, mapId, roster, chargedAbilities, hourglass, audio }: MatchProps) {
  const { store, view } = useMatch(preset.definition, roster, { chargedAbilities });
  const quality = usePreference(preferences.effectsQuality);
  const { sounds } = audio;
  const { fullscreen, toggle: toggleFullscreen } = useFullscreen();
  useMatchAudio(store, sounds);
  const canFollow = isLargeBoard(preset);
  const { framing, pickFraming, freeLook, onFreeLook, follow } = useCameraChoice(view.activePlayerId);
  const models = useMemo(() => [...new Set(roster.flatMap(({ character }) => modelsOf(character)))], [roster]);
  /** The scene has loaded and compiled everything: the curtain lifts. */
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const nameOf = (id: string | null) => view.players.find((player) => player.id === id)?.name ?? null;
  const activePlayer = activePlayerOf(view);
  // The path as it stands, with the rifts Zarek's Void opened (the store's board is the plain one).
  const board = useMemo(() => withRifts(store.board, view.rifts), [store.board, view.rifts]);
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
  } = useAbilityUse(store, view, board, activePlayer);
  const { seconds, clockRunning, pausedBy, pausesLeft, pause, resume } = useMatchClock(store, view, hourglass, ready);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#05060b] text-white select-none">
      <div className="absolute inset-0">
        <BoardScene
          board={store.board}
          columns={preset.columns}
          mapId={mapId}
          view={view}
          cameraFraming={canFollow ? framing : "board"}
          onDiceImpact={sounds.diceLand}
          quality={quality}
          // Everyone plays at this one screen: whoever's turn it is sees their own secrets named.
          viewerId={view.activePlayerId}
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
          {hourglass && view.winnerId === null && (
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
              <PlayersPanel players={view.players} activePlayerId={view.activePlayerId} board={board} />
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
          board={board}
          activePlayer={activePlayer}
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
              lastRoll={view.lastRoll}
              isRolling={view.isRolling}
              isAnimating={view.isAnimating}
              isFinished={view.winnerId !== null}
              onRoll={store.rollDice}
              onRestart={store.restart}
            />
          </div>
        </footer>
      </div>

      <CastOverlay cast={view.fx.cast} />
      <DrawOverlay drawing={view.fx.drawing} />
      <FusionOverlay fusing={view.fx.fusing} />
      <TransmuteOverlay transmuting={view.fx.transmuting} />
      {choosing && abilityCtx && canActivateAbility(view) && AbilityPicker && <AbilityPicker ctx={abilityCtx} />}
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
      <PendingPrompts store={store} view={view} nameOf={nameOf} />
      <LoadingCurtain ready={ready} />
      {pausedBy !== null && (
        <PauseOverlay
          name={nameOf(pausedBy) ?? ""}
          pausesLeft={pausesLeft(pausedBy)}
          onResume={resume}
        />
      )}
    </main>
  );
}
