"use client";

import { ArrowLeft, LocateFixed, Map as MapIcon, Music, Volume2, VolumeX } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { preferences, usePreference } from "@/features/settings/preferences";
import { cn } from "@/lib/utils";
import { boardPresetFor, isLargeBoard, type BoardPreset } from "../boards";
import { CHARACTERS, rosterEntry, type CharacterId, type RosterEntry } from "../characters";
import {
  needsCardChoice,
  needsDiscardChoice,
  needsSealPlacement,
  needsSpecterPlacement,
  PLUNDER_CARDS,
  RESURRECTION_CARDS,
} from "@/game/domain/abilities";
import { sameSpace } from "@/game/domain/board";
import { sealableTiles, takenBySealsOf } from "@/game/domain/seals";
import { hauntableTiles, takenForSpecters } from "@/game/domain/specters";
import { HAND_LIMIT } from "@/game/domain/cards";
import { activePlayerOf, canActivateAbility, canPlayCard, cardsLeftThisTurn } from "../model/matchView";
import { useMatch } from "../hooks/useMatch";
import { useGameAudio, type GameAudio } from "../hooks/useGameAudio";
import { useMatchAudio } from "../hooks/useMatchAudio";
import { preloadCharacterModel } from "../scene/character/CharacterModel";
import { CardHand } from "./cards/CardHand";
import { CastOverlay } from "./cards/CastOverlay";
import { DiscardPicker } from "./cards/DiscardPicker";
import { DrawOverlay } from "./cards/DrawOverlay";
import { CardChoicePicker } from "./cards/CardChoicePicker";
import { TransmuteOverlay } from "./cards/TransmuteOverlay";
import { TransmutePicker } from "./cards/TransmutePicker";
import { DicePanel } from "./hud/DicePanel";
import { EffectBanner } from "./hud/EffectBanner";
import { AbilityMeter } from "./hud/AbilityMeter";
import { ErrorToast } from "./hud/ErrorToast";
import { PlayersPanel } from "./hud/PlayersPanel";
import { PlacementPicker } from "./hud/PlacementPicker";
import { SEAL_STEPS, SPECTER_STEPS } from "./placementText";
import { WardPrompt } from "./hud/WardPrompt";

const BoardScene = dynamic(() => import("../scene/BoardScene"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-zinc-500">Carregando arena…</div>,
});

export interface MatchScreenProps {
  boardId: string;
  characterId: CharacterId;
}

/** A local match on the chosen board, playing the chosen character (picked on /jogar). */
export function MatchScreen({ boardId, characterId }: MatchScreenProps) {
  const preset = boardPresetFor(boardId);
  const [roster] = useState(() => [rosterEntry(characterId)]);
  const audio = useGameAudio();
  // Start fetching the models while the arena's code is still loading.
  useEffect(() => roster.forEach(({ id }) => preloadCharacterModel(CHARACTERS[id].model)), [roster]);

  return <Match preset={preset} roster={roster} audio={audio} />;
}

interface MatchProps {
  preset: BoardPreset;
  roster: readonly RosterEntry[];
  audio: GameAudio;
}

function Match({ preset, roster, audio }: MatchProps) {
  const { store, view } = useMatch(preset.definition, roster);
  const quality = usePreference(preferences.effectsQuality);
  const { sounds, muted, toggleMuted, musicOn, toggleMusic } = audio;
  useMatchAudio(store, sounds);
  const [overview, setOverview] = useState(false);
  const canFollow = isLargeBoard(preset);
  const nameOf = (id: string | null) => view.players.find((player) => player.id === id)?.name ?? null;
  const activePlayer = activePlayerOf(view);
  const discardingPlayer = view.players.find((player) => player.id === view.pendingDiscard?.playerId);
  const wardingPlayer = view.players.find((player) => player.id === view.pendingWard?.playerId);
  const plunderVictim = view.players.find((player) => player.id === view.pendingPlunder?.victim);
  /** Picking the cards or tiles for an ability that works on some (Transmutation, Resurrection, Forbidden Seals). */
  const [choosingCard, setChoosingCard] = useState(false);
  const ability = activePlayer?.ability ?? null;
  const activateAbility = () => {
    if (
      needsCardChoice(ability) ||
      needsDiscardChoice(ability) ||
      needsSealPlacement(ability) ||
      needsSpecterPlacement(ability)
    ) {
      setChoosingCard(true);
    } else store.activateAbility();
  };
  const pickCards = (cardUids: string[]) => {
    setChoosingCard(false);
    store.activateAbility({ cardUids });
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#05060b] text-white">
      <div className="absolute inset-0">
        <BoardScene
          board={store.board}
          columns={preset.columns}
          view={view}
          followCamera={canFollow && !overview}
          onDiceImpact={sounds.diceLand}
          quality={quality}
          // A local match has one person at the screen: the first player.
          viewerId={roster[0]?.id ?? null}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
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
              </div>
            </div>
          </div>
        </header>

        <div className="absolute inset-x-0 top-24 flex justify-center px-4 sm:top-6">
          <ErrorToast error={view.error} />
        </div>

        <div className="flex justify-center">
          <EffectBanner effect={view.effect} winnerName={nameOf(view.winnerId)} nameOf={nameOf} />
        </div>

        {/* One column on the right, so the hand always sits below the players and never covers them. */}
        <div className="absolute top-4 right-4 flex flex-col items-end gap-4 sm:top-6 sm:right-6">
          {view.players.length > 1 && (
            <div className="pointer-events-auto max-sm:hidden">
              <PlayersPanel players={view.players} activePlayerId={view.activePlayerId} board={store.board} />
            </div>
          )}
          {activePlayer && view.winnerId === null && (
            <div className="pointer-events-auto max-sm:mt-20">
              <CardHand
                key={activePlayer.id}
                board={store.board}
                player={activePlayer}
                // Only opponents in the same place can be aimed at: a realm track is cut off from the board.
                opponents={view.players.filter(
                  (player) =>
                    player.id !== activePlayer.id && sameSpace(store.board, player.position, activePlayer.position),
                )}
                canPlay={canPlayCard(view)}
                cardsLeft={cardsLeftThisTurn(view)}
                lastDrawnUid={view.lastDrawnUid}
                onPlay={store.playCard}
                status={
                  <AbilityMeter
                    player={activePlayer}
                    inUse={view.abilityInUse !== null && view.abilityInUse === activePlayer.ability}
                    onActivate={activateAbility}
                    canActivate={canActivateAbility(view)}
                  />
                }
              />
            </div>
          )}
        </div>

        <footer className="relative flex items-end justify-center">
          {canFollow && (
            <button
              type="button"
              onClick={() => setOverview((current) => !current)}
              className="hud-panel pointer-events-auto absolute bottom-0 left-0 flex items-center gap-2 px-3 py-2.5 text-xs font-bold tracking-wider text-zinc-200 uppercase transition-colors hover:text-white max-sm:bottom-auto max-sm:-top-14"
            >
              {overview ? <LocateFixed className="size-4" /> : <MapIcon className="size-4" />}
              {overview ? "Seguir jogador" : "Ver tabuleiro"}
            </button>
          )}
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

      <CastOverlay cast={view.cast} />
      <DrawOverlay drawing={view.drawing} />
      <TransmuteOverlay transmuting={view.transmuting} />
      {choosingCard && activePlayer && canActivateAbility(view) && needsCardChoice(ability) && (
        <TransmutePicker
          hand={activePlayer.hand}
          onPick={(cardUid) => pickCards([cardUid])}
          onCancel={() => setChoosingCard(false)}
        />
      )}
      {choosingCard && activePlayer && canActivateAbility(view) && needsDiscardChoice(ability) && (
        <CardChoicePicker
          title="Ressurreição"
          subtitle="Escolha cartas já jogadas: elas voltam para a sua mão."
          accent="teal"
          // Newest first: the cards just played are the ones most often wanted back.
          cards={[...activePlayer.discard].reverse()}
          max={Math.min(RESURRECTION_CARDS, HAND_LIMIT - activePlayer.hand.length)}
          confirmLabel="Trazer de volta"
          onPick={pickCards}
          onCancel={() => setChoosingCard(false)}
        />
      )}
      {choosingCard && activePlayer && canActivateAbility(view) && needsSealPlacement(ability) && (
        <PlacementPicker
          title="Escritura dos 4 Selos"
          tone="text-fuchsia-300"
          steps={SEAL_STEPS}
          tiles={sealableTiles(store.board, activePlayer.position, [
            ...takenBySealsOf(view.seals, activePlayer.id),
            ...view.specters.map((specter) => specter.tile),
          ])}
          position={activePlayer.position}
          confirmLabel="Escrever selos"
          onPick={(sealTiles) => {
            setChoosingCard(false);
            store.activateAbility({ sealTiles });
          }}
          onCancel={() => setChoosingCard(false)}
        />
      )}
      {choosingCard && activePlayer && canActivateAbility(view) && needsSpecterPlacement(ability) && (
        <PlacementPicker
          title="Aparições Espectrais"
          tone="text-sky-300"
          steps={SPECTER_STEPS}
          tiles={hauntableTiles(
            store.board,
            activePlayer.position,
            takenForSpecters(view.seals, view.specters, activePlayer.id),
          )}
          position={activePlayer.position}
          confirmLabel="Invocar aparições"
          onPick={(specterTiles) => {
            setChoosingCard(false);
            store.activateAbility({ specterTiles });
          }}
          onCancel={() => setChoosingCard(false)}
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
    </main>
  );
}
