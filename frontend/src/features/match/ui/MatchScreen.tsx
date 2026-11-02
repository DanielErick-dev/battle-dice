"use client";

import {
  ArrowLeft,
  LocateFixed,
  Map as MapIcon,
  Maximize,
  Minimize,
  Music,
  Scan,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { preferences, usePreference } from "@/features/settings/preferences";
import { useFullscreen } from "@/lib/useFullscreen";
import { useTurnState } from "@/lib/useTurnState";
import { cn } from "@/lib/utils";
import { boardPresetFor, isLargeBoard, type BoardPreset } from "../boards";
import type { MapId } from "../maps";
import { CHARACTERS, rosterOf, type CharacterDefinition, type CharacterId, type RosterEntry } from "../characters";
import { blessingTurns, inHeaven } from "@/game/domain/board/blessings";
import { DIVINE_CARDS } from "@/game/domain/cards/catalog";
import { PLUNDER_CARDS } from "@/game/domain/characters/warden/specters";
import { activePlayerOf, canActivateAbility, canPlayCard, canRoll, cardsLeftThisTurn } from "../model/matchView";
import { useMatch } from "../hooks/useMatch";
import { useGameAudio, type GameAudio } from "../hooks/useGameAudio";
import { useMatchAudio } from "../hooks/useMatchAudio";
import type { BoardPicking } from "../scene/BoardScene";
import type { CameraFraming } from "../scene/CameraRig";
import type { TileId } from "@/game/domain/types";
import { preloadCharacterModel } from "../scene/character/core/CharacterModel";
import { preloadChairs, type ChairId } from "../scene/character/accessories/chairs";
import { CardHand } from "./cards/CardHand";
import { CastOverlay } from "./cards/CastOverlay";
import { DiscardPicker } from "./cards/DiscardPicker";
import { DrawOverlay } from "./cards/DrawOverlay";
import { FusionOverlay } from "./cards/FusionOverlay";
import { CardChoicePicker } from "./cards/CardChoicePicker";
import { TransmuteOverlay } from "./cards/TransmuteOverlay";
import { DicePanel } from "./hud/DicePanel";
import { EffectBanner } from "./hud/EffectBanner";
import { AbilityMeter } from "./hud/AbilityMeter";
import { BlessingBadges } from "./hud/BlessingBadges";
import { ErrorToast } from "./hud/ErrorToast";
import { LoadingCurtain } from "./hud/LoadingCurtain";
import { PlayersPanel } from "./hud/PlayersPanel";
import { BattleLog } from "./hud/BattleLog";
import { TilePicking } from "./hud/TilePicking";
import { ABILITY_FLOWS, placementOf, type AbilityContext, type AbilityScene, type Placement } from "./abilities";
import { GracePrompt } from "./hud/GracePrompt";
import { WardPrompt } from "./hud/WardPrompt";
import { VoidHold } from "./hud/VoidHold";
import { withRifts } from "@/game/domain/characters/zarek/void";

const NO_TILES: TileId[] = [];

/** The camera's framings, closest first: following the player up close, from midway, or the whole board. */
const FRAMINGS: readonly { framing: CameraFraming; label: string; Icon: LucideIcon }[] = [
  { framing: "close", label: "Perto", Icon: LocateFixed },
  { framing: "mid", label: "Médio", Icon: Scan },
  { framing: "board", label: "Tabuleiro", Icon: MapIcon },
];

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
}

/** A local match on the chosen board: everyone plays at this screen, taking turns. */
export function MatchScreen({ boardId, mapId, characters, chargedAbilities }: MatchScreenProps) {
  const preset = boardPresetFor(boardId);
  const [roster] = useState(() => rosterOf(characters));
  const audio = useGameAudio();
  // Start fetching the models while the arena's code is still loading.
  useEffect(() => roster.flatMap(({ character }) => modelsOf(character)).forEach(preloadCharacterModel), [roster]);
  useEffect(() => preloadChairs(roster.flatMap(({ character }) => chairsOf(character))), [roster]);

  return <Match preset={preset} mapId={mapId} roster={roster} chargedAbilities={chargedAbilities} audio={audio} />;
}

interface MatchProps {
  preset: BoardPreset;
  mapId: MapId;
  roster: readonly RosterEntry[];
  chargedAbilities: boolean;
  audio: GameAudio;
}

function Match({ preset, mapId, roster, chargedAbilities, audio }: MatchProps) {
  const { store, view } = useMatch(preset.definition, roster, { chargedAbilities });
  const quality = usePreference(preferences.effectsQuality);
  const { sounds, muted, toggleMuted, musicOn, toggleMusic } = audio;
  const { fullscreen, toggle: toggleFullscreen } = useFullscreen();
  useMatchAudio(store, sounds);
  const canFollow = isLargeBoard(preset);
  const [framing, setFraming] = useState<CameraFraming>("close");
  /**
   * Whose turn it was when the viewer dragged the camera away to look around: it follows nobody
   * until they ask for their character again, pick a framing, or the turn passes.
   */
  const [lookingAroundOn, setLookingAroundOn] = useState<string | null>(null);
  const freeLook = lookingAroundOn !== null && lookingAroundOn === view.activePlayerId;
  const onFreeLook = useCallback(() => setLookingAroundOn(view.activePlayerId), [view.activePlayerId]);
  const models = useMemo(() => [...new Set(roster.flatMap(({ character }) => modelsOf(character)))], [roster]);
  /** The scene has loaded and compiled everything: the curtain lifts. */
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const nameOf = (id: string | null) => view.players.find((player) => player.id === id)?.name ?? null;
  const activePlayer = activePlayerOf(view);
  const discardingPlayer = view.players.find((player) => player.id === view.pendingDiscard?.playerId);
  const wardingPlayer = view.players.find((player) => player.id === view.pendingWard?.playerId);
  const plunderVictim = view.players.find((player) => player.id === view.pendingPlunder?.victim);
  const gracedPlayer = view.players.find((player) => player.id === view.pendingGrace?.playerId);
  // These choices belong to the turn they're made on: the next player starts with none of them.
  /** An ability's picker is open (whom to aim at, which power or cards: see ui/abilities). */
  const [choosing, setChoosing] = useTurnState(false, view.activePlayerId);
  /** Picking tiles on the board for an ability (seals, apparitions, black fire), and those picked so far. */
  const [placing, setPlacing] = useTurnState<Placement | null>(null, view.activePlayerId);
  const [picked, setPicked] = useTurnState<TileId[]>(NO_TILES, view.activePlayerId);
  const stopPlacing = () => {
    setPlacing(null);
    setPicked([]);
  };
  const ability = activePlayer?.ability ?? null;
  const flow = ability ? ABILITY_FLOWS[ability] : undefined;
  // The path as it stands, with the rifts Zarek's Void opened (the store's board is the plain one).
  const board = useMemo(() => withRifts(store.board, view.rifts), [store.board, view.rifts]);
  const scene: AbilityScene | null = activePlayer ? { board, view, player: activePlayer } : null;
  const abilityCtx: AbilityContext | null = scene && {
    ...scene,
    use: (choice) => {
      setChoosing(false);
      store.activateAbility(choice);
    },
    place: (placement) => {
      setChoosing(false);
      setPlacing(placement);
    },
    cancel: () => setChoosing(false),
  };
  const activateAbility = () => {
    const first = scene && flow ? flow.start(scene) : null;
    if (first === "picker") setChoosing(true);
    else if (first) setPlacing(first);
    else store.activateAbility();
  };
  // Setting the Void's things down needs no charge, only the player's moment to act.
  const canPlace = placing !== null && (typeof placing === "object" ? canRoll(view) : canActivateAbility(view));
  const placement = placing && scene && canPlace ? placementOf(placing, scene) : null;
  const picking: BoardPicking | null = placement && {
    tiles: new Set(
      picked.length < placement.steps.length ? placement.tiles.filter((tile) => !picked.includes(tile)) : [],
    ),
    picked: picked.map((tile, index) => ({
      tile,
      tag: placement.steps[index].tag,
      color: placement.steps[index].color,
    })),
    onPick: (tile) => setPicked((current) => (current.includes(tile) ? current : [...current, tile])),
    cursor: placement.cursor,
  };
  const AbilityPicker = flow?.Picker;

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
        <header className="flex flex-col items-start gap-3">
          <div className="hud-panel pointer-events-auto flex flex-col gap-3 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  aria-label="Voltar ao menu"
                  title="Voltar ao menu"
                  className="grid size-9 place-items-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="size-5" />
                </Link>
                <div>
                  <h1 className="text-lg leading-none font-black tracking-[0.2em] uppercase">
                    Battle <span className="text-orange-500">Dice</span>
                  </h1>
                  <p className="mt-1 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
                    {preset.name} · {preset.definition.size} casas
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={toggleMusic}
                  disabled={muted}
                  aria-pressed={musicOn}
                  aria-label={musicOn ? "Desligar música" : "Ligar música"}
                  title={musicOn ? "Desligar música e ambiente" : "Ligar música e ambiente"}
                  className={cn(
                    "grid size-9 place-items-center rounded-lg transition-colors hover:bg-white/10 disabled:opacity-40",
                    musicOn ? "text-zinc-300 hover:text-white" : "text-zinc-600",
                  )}
                >
                  <Music className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={toggleMuted}
                  aria-pressed={muted}
                  aria-label={muted ? "Ligar som" : "Desligar som"}
                  title={muted ? "Ligar som" : "Desligar som"}
                  className="grid size-9 place-items-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-pressed={fullscreen}
                  aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
                  title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
                  className="grid size-9 place-items-center rounded-lg text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
                </button>
              </div>
            </div>
          </div>
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

        <div className="flex justify-center">
          <EffectBanner effect={view.effect} winnerName={nameOf(view.winnerId)} nameOf={nameOf} />
        </div>

        {/* The hand and its meters, in a column on the right. */}
        <div className="absolute top-4 right-4 flex flex-col items-end gap-4 sm:top-6 sm:right-6">
          {activePlayer && view.winnerId === null && (
            <div className="pointer-events-auto max-sm:mt-20">
              <CardHand
                key={activePlayer.id}
                table={{
                  board,
                  blackFlames: view.blackFlames,
                  winter: view.winter,
                  destroyedTraps: view.destroyedTraps,
                  pinnedTraps: view.pinnedTraps,
                  enchantedTiles: view.enchantedTiles,
                }}
                player={activePlayer}
                // Who each card can be aimed at (see cardTargets); a protected one turns it away.
                players={view.players}
                canPlay={canPlayCard(view)}
                cardsLeft={cardsLeftThisTurn(view)}
                lastDrawnUid={view.lastDrawnUid}
                onPlay={store.playCard}
                onFuse={canRoll(view) ? store.fuseCards : null}
                onSacrifice={canRoll(view) ? store.sacrificeEnergy : null}
                status={
                  <>
                    <AbilityMeter
                      player={activePlayer}
                      inUse={view.abilityInUse !== null && view.abilityInUse === activePlayer.ability}
                      onActivate={activateAbility}
                      canActivate={canActivateAbility(view)}
                    />
                    <VoidHold
                      player={activePlayer}
                      canAct={canRoll(view)}
                      onRelease={(release, doubled) => setPlacing({ release, doubled })}
                    />
                    <BlessingBadges player={activePlayer} waiting={inHeaven(board, activePlayer.position)} />
                  </>
                }
              />
            </div>
          )}
        </div>

        <footer className="relative flex items-end justify-center">
          <div className="absolute bottom-0 left-0 flex flex-wrap items-end gap-2 max-sm:bottom-auto max-sm:-top-14">
            {canFollow && (
              <div role="radiogroup" aria-label="Câmera" className="hud-panel pointer-events-auto flex gap-1 p-1">
                {FRAMINGS.map(({ framing: option, label, Icon }) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={framing === option}
                    onClick={() => {
                      setFraming(option);
                      setLookingAroundOn(null);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold tracking-wider uppercase transition-colors",
                      framing === option ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}
            {freeLook && (
              <button
                type="button"
                onClick={() => setLookingAroundOn(null)}
                className="hud-panel pointer-events-auto flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold tracking-wider text-amber-200 uppercase transition-colors hover:text-white"
              >
                <LocateFixed className="size-4" />
                Meu personagem
              </button>
            )}
          </div>
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
          onUndo={() => setPicked((current) => current.slice(0, -1))}
          onCancel={stopPlacing}
          onConfirm={() => {
            placement.send(store, picked);
            stopPlacing();
          }}
        />
      )}
      {view.pendingGrace?.offer === "blessing" && gracedPlayer && !view.isAnimating && (
        <GracePrompt turns={blessingTurns(gracedPlayer)} onPick={(blessing) => store.chooseGrace({ blessing })} />
      )}
      {view.pendingGrace?.offer === "relic" && !view.isAnimating && (
        <CardChoicePicker
          title="Relicário do Céu"
          subtitle="Escolha a relíquia que você leva."
          accent="amber"
          cards={DIVINE_CARDS.map((cardId) => ({ uid: cardId, cardId }))}
          max={1}
          required
          confirmLabel="Levar relíquia"
          onPick={([cardId]) => {
            const relic = DIVINE_CARDS.find((candidate) => candidate === cardId);
            if (relic) store.chooseGrace({ cardId: relic });
          }}
        />
      )}
      {view.pendingPlunder && plunderVictim && !view.isAnimating && (
        <CardChoicePicker
          title="Pilhagem Espectral"
          subtitle={`${nameOf(view.pendingPlunder.owner)}: escolha ${Math.min(PLUNDER_CARDS, plunderVictim.hand.length)} cartas de ${plunderVictim.name}.`}
          accent="sky"
          cards={plunderVictim.hand}
          max={Math.min(PLUNDER_CARDS, plunderVictim.hand.length)}
          required
          confirmLabel="Pilhar"
          onPick={store.plunderCards}
        />
      )}
      {view.pendingWard && wardingPlayer?.ability && !view.isAnimating && (
        <WardPrompt ability={wardingPlayer.ability} threat={view.pendingWard.threat} onAnswer={store.answerWard} />
      )}
      {view.pendingDiscard && discardingPlayer && !view.isAnimating && (
        <DiscardPicker hand={discardingPlayer.hand} drawn={view.pendingDiscard.drawn} onDiscard={store.discardCard} />
      )}
      <LoadingCurtain ready={ready} />
    </main>
  );
}

/** The chairs a character may sit on: their own, and their fallen form's. */
function chairsOf(character: CharacterId): ChairId[] {
  const { chair, fallenChair }: CharacterDefinition = CHARACTERS[character];
  return [chair, fallenChair].filter((id) => id !== undefined);
}

/** The models a character may show in the match: their own, and their fallen form's (Seraphiel). */
function modelsOf(character: CharacterId): string[] {
  const { model, fallenModel }: CharacterDefinition = CHARACTERS[character];
  return fallenModel ? [model, fallenModel] : [model];
}
