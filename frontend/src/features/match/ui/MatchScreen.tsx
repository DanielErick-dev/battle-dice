"use client";

import {
  ArrowLeft,
  Layers,
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
import { cn } from "@/lib/utils";
import { boardPresetFor, isLargeBoard, type BoardPreset } from "../boards";
import { CHARACTERS, rosterOf, type CharacterId, type RosterEntry } from "../characters";
import {
  needsCardChoice,
  needsDiscardChoice,
  needsSealPlacement,
  needsSpecterPlacement,
  ARMOUR_TURNS,
  ARROW_RAIN_PINS,
  ARROW_RAIN_PUSH,
  FLAME_TILES,
  FLAME_TURNS,
  PLUNDER_CARDS,
  RESURRECTION_CARDS,
  TRANSMUTATION_CARDS,
  TIME_ROUNDS,
} from "@/game/domain/abilities";
import { timeTargets } from "@/game/domain/newcomerAbilities";
import { opponentsInReach } from "@/game/domain/board";
import { sealableTiles, sealedTiles } from "@/game/domain/seals";
import { flammableTiles } from "@/game/domain/kunoichi";
import { hauntableTiles, takenForSpecters } from "@/game/domain/specters";
import { HAND_LIMIT, MAX_RARITY_LEVEL } from "@/game/domain/cards";
import { activePlayerOf, canActivateAbility, canPlayCard, cardsLeftThisTurn } from "../model/matchView";
import { useMatch } from "../hooks/useMatch";
import { useGameAudio, type GameAudio } from "../hooks/useGameAudio";
import { useMatchAudio } from "../hooks/useMatchAudio";
import type { BoardPicking } from "../scene/BoardScene";
import type { CameraFraming } from "../scene/CameraRig";
import type { TileId } from "@/game/domain/types";
import { preloadCharacterModel } from "../scene/character/CharacterModel";
import { CardHand } from "./cards/CardHand";
import { CastOverlay } from "./cards/CastOverlay";
import { DiscardPicker } from "./cards/DiscardPicker";
import { DrawOverlay } from "./cards/DrawOverlay";
import { CardChoicePicker } from "./cards/CardChoicePicker";
import { TransmuteOverlay } from "./cards/TransmuteOverlay";
import { DicePanel } from "./hud/DicePanel";
import { EffectBanner } from "./hud/EffectBanner";
import { AbilityMeter } from "./hud/AbilityMeter";
import { BlessingBadges } from "./hud/BlessingBadges";
import { ErrorToast } from "./hud/ErrorToast";
import { LoadingCurtain } from "./hud/LoadingCurtain";
import { PlayersPanel } from "./hud/PlayersPanel";
import { TilePicking } from "./hud/TilePicking";
import { FLAME_STEPS, SEAL_STEPS, SPECTER_STEPS } from "./placementText";
import { TargetPicker } from "./hud/TargetPicker";
import { WardPrompt } from "./hud/WardPrompt";

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
  /** One player per character, in turn order (picked on /jogar); the same character may repeat. */
  characters: readonly CharacterId[];
  /** Test mode: every ability starts charged. */
  chargedAbilities: boolean;
}

/** A local match on the chosen board: everyone plays at this screen, taking turns. */
export function MatchScreen({ boardId, characters, chargedAbilities }: MatchScreenProps) {
  const preset = boardPresetFor(boardId);
  const [roster] = useState(() => rosterOf(characters));
  const audio = useGameAudio();
  // Start fetching the models while the arena's code is still loading.
  useEffect(() => roster.forEach(({ character }) => preloadCharacterModel(CHARACTERS[character].model)), [roster]);

  return <Match preset={preset} roster={roster} chargedAbilities={chargedAbilities} audio={audio} />;
}

interface MatchProps {
  preset: BoardPreset;
  roster: readonly RosterEntry[];
  chargedAbilities: boolean;
  audio: GameAudio;
}

function Match({ preset, roster, chargedAbilities, audio }: MatchProps) {
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
  const models = useMemo(() => [...new Set(roster.map(({ character }) => CHARACTERS[character].model))], [roster]);
  /** The scene has loaded and compiled everything: the curtain lifts. */
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const nameOf = (id: string | null) => view.players.find((player) => player.id === id)?.name ?? null;
  const activePlayer = activePlayerOf(view);
  const discardingPlayer = view.players.find((player) => player.id === view.pendingDiscard?.playerId);
  const wardingPlayer = view.players.find((player) => player.id === view.pendingWard?.playerId);
  const plunderVictim = view.players.find((player) => player.id === view.pendingPlunder?.victim);
  /** Picking what an ability works on: cards, tiles or an opponent (Transmutation, Forbidden Seals, Card Gamble…). */
  const [choosingCard, setChoosingCard] = useState(false);
  /** Picking tiles on the board for an ability (seals, apparitions, black fire), and those picked so far. */
  const [placing, setPlacing] = useState<"seals" | "specters" | "flames" | null>(null);
  const [picked, setPicked] = useState<TileId[]>([]);
  const stopPlacing = () => {
    setPlacing(null);
    setPicked([]);
  };
  const placement = placing && activePlayer && canActivateAbility(view) ? placementOf(placing) : null;
  function placementOf(kind: "seals" | "specters" | "flames") {
    const position = activePlayer?.position ?? 0;
    switch (kind) {
      case "seals":
        return {
          title: "Escritura dos 4 Selos",
          tone: "text-fuchsia-300",
          steps: SEAL_STEPS,
          tiles: sealableTiles(store.board, position, [
            ...sealedTiles(view.seals),
            ...view.specters.map((specter) => specter.tile),
          ]),
          confirmLabel: "Escrever selos",
          use: (sealTiles: TileId[]) => store.activateAbility({ sealTiles }),
        };
      case "specters":
        return {
          title: "Aparições Espectrais",
          tone: "text-sky-300",
          steps: SPECTER_STEPS,
          tiles: hauntableTiles(store.board, position, takenForSpecters(view.seals, view.specters)),
          confirmLabel: "Invocar aparições",
          use: (specterTiles: TileId[]) => store.activateAbility({ specterTiles }),
        };
      case "flames":
        return {
          title: "Chamas Eternas",
          tone: "text-orange-400",
          steps: FLAME_STEPS,
          tiles: flammableTiles(
            store.board,
            position,
            view.blackFlames.map((flame) => flame.tile),
          ),
          confirmLabel: "Incendiar",
          use: (flameTiles: TileId[]) => store.activateAbility({ power: "flames", flameTiles }),
        };
    }
  }
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
  };
  const ability = activePlayer?.ability ?? null;
  // The opponents an aimed ability can reach (Card Gamble, Arrow Rain), with their seats.
  const reachable = activePlayer
    ? opponentsInReach(store.board, view.players, activePlayer.id).map((player) => ({
        player,
        seat: view.players.indexOf(player),
      }))
    : [];
  const holders = reachable.filter(({ player }) => player.hand.length > 0);
  // Time Warp reaches any opponent not under Spectral Armour, wherever they are.
  const timeBendable = activePlayer
    ? timeTargets(view.players, activePlayer.id).map((player) => ({ player, seat: view.players.indexOf(player) }))
    : [];
  /** Time Warp's power, once picked: the opponent comes next. */
  const [timePower, setTimePower] = useState<"halt" | "reverse" | null>(null);
  const stopChoosing = () => {
    setChoosingCard(false);
    setTimePower(null);
  };
  const activateAbility = () => {
    // Card Gamble asks whom to bet against when there's a choice; Arrow Rain, whether to strike whoever is in reach.
    if (
      (ability === "cardGamble" && holders.length > 1) ||
      (ability === "arrowRain" && reachable.length > 0) ||
      (ability === "timeWarp" && timeBendable.length > 0) ||
      ability === "ocularAwakening"
    ) {
      setChoosingCard(true);
      return;
    }
    if (ability === "cardGamble" && holders.length === 1) {
      store.activateAbility({ targetId: holders[0].player.id });
      return;
    }
    if (needsSealPlacement(ability)) setPlacing("seals");
    else if (needsSpecterPlacement(ability)) setPlacing("specters");
    // A hand too thin to sacrifice from leaves Transmutation nothing to pick: it distils a card straight away.
    else if (
      (needsCardChoice(ability) && (activePlayer?.hand.length ?? 0) >= TRANSMUTATION_CARDS) ||
      needsDiscardChoice(ability)
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
              <PlayersPanel players={view.players} activePlayerId={view.activePlayerId} board={store.board} />
            </div>
          )}
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
                board={store.board}
                player={activePlayer}
                // Only opponents in the same place, and not under Spectral Armour, can be aimed at.
                opponents={reachable.map(({ player }) => player)}
                canPlay={canPlayCard(view)}
                cardsLeft={cardsLeftThisTurn(view)}
                lastDrawnUid={view.lastDrawnUid}
                onPlay={store.playCard}
                status={
                  <>
                    <AbilityMeter
                      player={activePlayer}
                      inUse={view.abilityInUse !== null && view.abilityInUse === activePlayer.ability}
                      onActivate={activateAbility}
                      canActivate={canActivateAbility(view)}
                    />
                    <BlessingBadges player={activePlayer} />
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

      <CastOverlay cast={view.cast} />
      <DrawOverlay drawing={view.drawing} />
      <TransmuteOverlay transmuting={view.transmuting} />
      {choosingCard && activePlayer && canActivateAbility(view) && needsCardChoice(ability) && (
        <CardChoicePicker
          title="Transmutação"
          subtitle={`Sacrifique ${TRANSMUTATION_CARDS} cartas: os níveis delas se somam numa carta aleatória desse nível (ex.: duas de nível 2 viram uma de nível 4; máximo ${MAX_RARITY_LEVEL}).`}
          accent="emerald"
          cards={activePlayer.hand}
          max={TRANSMUTATION_CARDS}
          required
          confirmLabel="Transmutar"
          onPick={pickCards}
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
            placement.use(picked);
            stopPlacing();
          }}
        />
      )}
      {choosingCard && activePlayer && canActivateAbility(view) && ability === "cardGamble" && (
        <TargetPicker
          title="Aposta do Coringa"
          tone="text-rose-300"
          subtitle="Contra quem você aposta? Ganhando, rouba cartas dele; perdendo, ele leva uma sua."
          targets={reachable}
          detail={(player) => (
            <>
              <Layers className="size-3.5" />
              {player.hand.length}
            </>
          )}
          unavailable={(player) => (player.hand.length === 0 ? "Sem cartas na mão" : undefined)}
          onPick={(targetId) => {
            setChoosingCard(false);
            store.activateAbility({ targetId });
          }}
          onCancel={() => setChoosingCard(false)}
        />
      )}
      {choosingCard && activePlayer && canActivateAbility(view) && ability === "arrowRain" && (
        <TargetPicker
          title="Chuva de Flechas"
          tone="text-lime-300"
          subtitle={`Prenda as próximas ${ARROW_RAIN_PINS} armadilhas à frente ou faça todos os oponentes voltarem ${ARROW_RAIN_PUSH} casas.`}
          alternatives={[
            {
              label: "Atacar os oponentes",
              detail: `${reachable.length === 1 ? "1 volta" : `${reachable.length} voltam`} ${ARROW_RAIN_PUSH} casas`,
              onPick: () => {
                setChoosingCard(false);
                store.activateAbility({ volley: "opponents" });
              },
            },
            {
              label: "Prender armadilhas",
              detail: `${ARROW_RAIN_PINS} à frente`,
              onPick: () => {
                setChoosingCard(false);
                store.activateAbility();
              },
            },
          ]}
          onCancel={() => setChoosingCard(false)}
        />
      )}
      {choosingCard && activePlayer && canActivateAbility(view) && ability === "ocularAwakening" && (
        <TargetPicker
          title="Despertar Ocular"
          tone="text-orange-400"
          subtitle="Escolha o poder que seus olhos despertam."
          alternatives={[
            {
              label: "Chamas Eternas",
              detail: `fogo negro em ${FLAME_TILES} casas por ${FLAME_TURNS} rodadas`,
              onPick: () => {
                setChoosingCard(false);
                setPlacing("flames");
              },
            },
            {
              label: "Armadura Espectral",
              detail: `imune aos outros por ${ARMOUR_TURNS} rodadas`,
              onPick: () => {
                setChoosingCard(false);
                store.activateAbility({ power: "armour" });
              },
            },
          ]}
          onCancel={() => setChoosingCard(false)}
        />
      )}
      {choosingCard && activePlayer && canActivateAbility(view) && ability === "timeWarp" && !timePower && (
        <TargetPicker
          title="Engrenagem do Tempo"
          tone="text-amber-500"
          subtitle="O que fazer com o tempo de um oponente?"
          alternatives={[
            {
              label: "Parar o tempo",
              detail: `fica ${TIME_ROUNDS} rodadas sem jogar`,
              onPick: () => setTimePower("halt"),
            },
            {
              label: "Inverter o tempo",
              detail: `o dado anda para trás por ${TIME_ROUNDS} rodadas`,
              onPick: () => setTimePower("reverse"),
            },
          ]}
          onCancel={stopChoosing}
        />
      )}
      {choosingCard && activePlayer && canActivateAbility(view) && ability === "timeWarp" && timePower && (
        <TargetPicker
          title={timePower === "halt" ? "Parar o tempo" : "Inverter o tempo"}
          tone="text-amber-500"
          subtitle="Escolha o oponente."
          targets={timeBendable}
          detail={(player) => <span className="font-mono">{player.position}</span>}
          onPick={(targetId) => {
            store.activateAbility({ power: timePower, targetId });
            stopChoosing();
          }}
          onCancel={stopChoosing}
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
