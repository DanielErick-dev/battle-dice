import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { inHeaven } from "@/game/domain/board/blessings";
import { withRifts } from "@/game/domain/characters/zarek/rifts";
import type { Board } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { characterFor, playerColor } from "@/features/characters";
import type { MatchStore } from "@/features/match/model/matchStore";
import { activePlayerOf, cardsLeftThisTurn, viewerControls, type MatchView } from "@/features/match/model/matchView";
import { EnergyMeter } from "@/features/match/ui/cards/EnergyMeter";
import { AbilityMeter } from "@/features/match/ui/hud/AbilityMeter";
import { BlessingBadges } from "@/features/match/ui/hud/BlessingBadges";
import { DiceFace } from "@/features/match/ui/hud/DiceFace";
import { ErrorToast } from "@/features/match/ui/hud/ErrorToast";
import { PlayersPanel } from "@/features/match/ui/hud/PlayersPanel";
import { VoidHold } from "@/features/match/ui/hud/VoidHold";
import { PendingPrompts } from "@/features/match/ui/screen/PendingPrompts";
import { useAbilityUse } from "@/features/match/ui/screen/useAbilityUse";
import { lastEvent } from "../model/lastEvent";
import { statusChips } from "../model/statusChips";
import { Avatar } from "./Avatar";
import { PhoneHand } from "./PhoneHand";
import { PhoneTilePicker } from "./PhoneTilePicker";
import { PHONE } from "./phoneStyles";

interface PhoneMatchProps {
  store: MatchStore;
  room: string;
  onLeave: () => void;
}

/** The controller once seated: no board, just this player's side of the match. */
export function PhoneMatch({ store, room, onLeave }: PhoneMatchProps) {
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  if (!view || !store.board) {
    return (
      <main className={PHONE.screen}>
        <p className="m-auto text-sm tracking-widest text-zinc-400 uppercase">Entrando na sala {room}…</p>
      </main>
    );
  }
  return <PhoneTable store={store} view={view} plainBoard={store.board} room={room} onLeave={onLeave} />;
}

const CHIP_TONES = {
  good: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
  bad: "bg-red-500/15 text-red-200 ring-red-400/30",
  info: "bg-amber-400/15 text-amber-100 ring-amber-300/30",
} as const;

interface PhoneTableProps extends PhoneMatchProps {
  view: MatchView;
  plainBoard: Board;
}

function PhoneTable({ store, view, plainBoard, room, onLeave }: PhoneTableProps) {
  const controls = viewerControls(view, store.pinnedSeat);
  const me = view.players.find((player) => player.id === controls.viewerId);
  const board = useMemo(() => withRifts(plainBoard, view.rifts), [plainBoard, view.rifts]);
  const ability = useAbilityUse(store, view, controls, board, activePlayerOf(view));
  const [showTable, setShowTable] = useState(false);
  const nameOf = (id: string | null) => view.players.find((player) => player.id === id)?.name ?? null;
  const myMove = controls.waitingFor === null && view.winnerId === null;
  useTurnBuzz(myMove && !view.isAnimating, `${view.turnCount}:${view.pendingDiscard?.drawn.uid ?? ""}`);
  const event = lastEvent(view.log, view.players);
  const character = me ? characterFor(me.id) : null;
  const { placement, picking } = ability;

  if (!me) return null;
  return (
    <main className={PHONE.screen}>
      <div className={cn(PHONE.column, "pb-8")}>
        <header className="flex items-center gap-3">
          <Avatar name={character?.name ?? me.name} color={playerColor(me.id)} className="size-12" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg leading-tight font-black">{me.name}</p>
            <p className="truncate text-xs text-zinc-400">
              {character ? `${character.epithet} · ` : ""}casa {me.position} · sala{" "}
              <span className="font-mono font-bold tracking-widest">{room}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onLeave}
            aria-label="Sair da sala"
            className="grid size-11 place-items-center rounded-full bg-white/5 text-zinc-400 ring-1 ring-white/10 active:bg-white/15"
          >
            <LogOut className="size-5" />
          </button>
        </header>

        <section aria-label="Seu estado" className="hud-panel flex flex-col gap-2 p-3">
          <EnergyMeter energy={me.energy} className="justify-between" />
          <AbilityMeter
            player={me}
            inUse={controls.ownsTurn && view.abilityInUse !== null && view.abilityInUse === me.ability}
            onActivate={ability.activateAbility}
            canActivate={controls.canActivateAbility}
          />
          <VoidHold player={me} canAct={controls.canRoll} onRelease={ability.releaseVoidItem} />
          <BlessingBadges player={me} waiting={inHeaven(board, me.position)} />
          {statusChips(me).length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {statusChips(me).map((chip) => (
                <li
                  key={chip.label}
                  className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", CHIP_TONES[chip.tone])}
                >
                  {chip.label}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p
          key={event?.id ?? 0}
          aria-live="polite"
          className="animate-in fade-in min-h-10 rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-zinc-300 duration-300"
        >
          {event?.text ?? "A partida começou. Boa sorte!"}
        </p>

        <TurnPanel
          view={view}
          myMove={myMove}
          canRoll={controls.canRoll}
          waitingName={nameOf(controls.waitingFor)}
          winnerName={nameOf(view.winnerId)}
          onRoll={store.rollDice}
        />

        <div className="flex justify-center">
          <ErrorToast error={view.error} />
        </div>

        {view.winnerId === null && (
          <PhoneHand
            key={me.id}
            table={{
              board,
              blackFlames: view.blackFlames,
              winter: view.winter,
              destroyedTraps: view.destroyedTraps,
              pinnedTraps: view.pinnedTraps,
              enchantedTiles: view.enchantedTiles,
              scarletFlames: view.scarletFlames,
              players: view.players,
              elementals: view.elementals,
            }}
            player={me}
            players={view.players}
            canPlay={controls.canPlayCard}
            cardsLeft={cardsLeftThisTurn(view)}
            lastDrawnUid={view.lastDrawnUid}
            onPlay={store.playCard}
            onFuse={controls.canRoll ? store.fuseCards : null}
            onSacrifice={controls.canRoll ? store.sacrificeEnergy : null}
          />
        )}

        {view.players.length > 1 && (
          <section aria-label="Mesa" className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowTable((open) => !open)}
              aria-expanded={showTable}
              className="flex h-11 items-center justify-between rounded-xl px-1 text-left"
            >
              <span className={PHONE.label}>Mesa · todos os jogadores</span>
              <ChevronDown className={cn("size-4 text-zinc-400 transition-transform", !showTable && "-rotate-90")} />
            </button>
            {showTable && (
              <div className="[&>section]:w-full">
                <PlayersPanel
                  players={view.players}
                  activePlayerId={view.activePlayerId}
                  viewerId={controls.viewerId}
                  board={board}
                />
              </div>
            )}
          </section>
        )}
      </div>

      {ability.choosing && ability.abilityCtx && controls.canActivateAbility && ability.AbilityPicker && (
        <div className="fixed inset-0 z-40">
          <ability.AbilityPicker ctx={ability.abilityCtx} />
        </div>
      )}
      {placement && picking && (
        <PhoneTilePicker
          title={placement.title}
          tone={placement.tone}
          steps={placement.steps}
          tiles={picking.tiles}
          picked={ability.picked}
          short={placement.tiles.length < placement.steps.length}
          confirmLabel={placement.confirmLabel}
          board={board}
          view={view}
          viewerId={controls.viewerId}
          onPick={picking.onPick}
          onUndo={ability.undoPick}
          onCancel={ability.stopPlacing}
          onConfirm={() => {
            placement.send(store, ability.picked);
            ability.stopPlacing();
          }}
        />
      )}
      {/* The match prompts are modals over `absolute inset-0`: pinned to the viewport, cards shrunk to fit three across. */}
      <div className="pointer-events-none fixed inset-0 z-40 [&_ul.grid>li]:w-24 [&>*]:pointer-events-auto">
        <PendingPrompts store={store} view={view} controls={controls} nameOf={nameOf} />
      </div>
    </main>
  );
}

interface TurnPanelProps {
  view: MatchView;
  /** Nobody else to wait on and the match still on. */
  myMove: boolean;
  canRoll: boolean;
  waitingName: string | null;
  winnerName: string | null;
  onRoll: () => void;
}

/** The big button: roll on your turn, a calm note on someone else's, the winner at the end. */
function TurnPanel({ view, myMove, canRoll, waitingName, winnerName, onRoll }: TurnPanelProps) {
  const roll = view.lastRoll;
  return (
    <section aria-label="Dado" className="hud-panel flex items-center gap-4 p-4">
      {/* A boosted or doubled roll goes past a die's six faces: the total as a number then. */}
      {roll && !view.isRolling && roll.total > 6 ? (
        <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-white/10 text-4xl font-black text-orange-400">
          {roll.total}
        </span>
      ) : (
        <DiceFace value={roll?.total ?? null} rolling={view.isRolling} />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {winnerName !== null ? (
          <p className="text-center text-lg font-black text-amber-200">🏆 {winnerName} venceu!</p>
        ) : myMove ? (
          <>
            <p className="text-xs font-black tracking-widest text-orange-300 uppercase">Sua vez!</p>
            <button type="button" onClick={onRoll} disabled={!canRoll} className={PHONE.primary}>
              {view.isAnimating ? "Aguarde…" : "Rolar dado"}
            </button>
          </>
        ) : (
          <p className="grid h-14 place-items-center rounded-2xl bg-white/5 px-2 text-center text-base font-bold text-zinc-300 ring-1 ring-white/10">
            Vez de {waitingName ?? "…"}…
          </p>
        )}
      </div>
    </section>
  );
}

/** A short buzz when the phone's moment to act begins (turn start, or a prompt waiting on it). */
function useTurnBuzz(active: boolean, key: string): void {
  const buzzed = useRef<string | null>(null);
  useEffect(() => {
    if (!active || buzzed.current === key) return;
    buzzed.current = key;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate([60, 40, 60]);
  }, [active, key]);
}
