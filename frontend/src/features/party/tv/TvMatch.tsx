"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { joinPartyOnChannel, type MatchHost } from "@/game/application/party";
import type { RosterEntry } from "@/features/characters";
import type { GameAudio } from "@/features/match/hooks/useGameAudio";
import { useMatchAudio } from "@/features/match/hooks/useMatchAudio";
import { driveBots } from "@/features/match/model/bots";
import { MatchStore } from "@/features/match/model/matchStore";
import type { MatchView } from "@/features/match/model/matchView";
import { MatchTable } from "@/features/match/ui/MatchScreen";
import { LoadingCurtain } from "@/features/match/ui/hud/LoadingCurtain";
import type { BoardPreset } from "@/features/shared/presets/boards";
import type { MapId } from "@/features/shared/presets/maps";
import type { TvSeat } from "./partyRoom";

/** The TV's own clientId: one TV per room, so it never needs to be unique. */
const TV_CLIENT_ID = "tv";

interface TvMatchProps {
  host: MatchHost;
  code: string;
  seats: readonly TvSeat[];
  preset: BoardPreset;
  mapId: MapId;
  roster: readonly RosterEntry[];
  audio: GameAudio;
}

/** The board as the table sees it: a spectator store on the room, no controls; restart goes straight to the host. */
export function TvMatch({ host, code, seats, preset, mapId, roster, audio }: TvMatchProps) {
  const [store] = useState(
    () =>
      new MatchStore(joinPartyOnChannel(code, { clientId: TV_CLIENT_ID, role: "spectator", name: "TV" }), undefined, {
        spectator: true,
      }),
  );
  useEffect(() => {
    // A failed join leaves the curtain down; the host lives in this same tab, so it only fails if it closed.
    store.open().catch(() => {});
    return store.close;
  }, [store]);
  const [sceneReady, setSceneReady] = useState(false);
  const onSceneReady = useCallback(() => setSceneReady(true), []);
  // The TV hosts the match, so it plays the computer's seats itself, once the board is on screen.
  useEffect(() => {
    if (!sceneReady) return;
    return driveBots(
      store,
      () => host.state,
      (command) => host.sendAsComputer(command),
      host.computerSeats,
    );
  }, [store, host, sceneReady]);
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
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
      store={store}
      view={view}
      plainBoard={store.board}
      preset={preset}
      mapId={mapId}
      roster={roster}
      hourglass={false}
      audio={audio}
      onRestart={() => void host.restart()}
      onReady={onSceneReady}
    >
      <TurnBanner view={view} seats={seats} />
      <PresenceNotes seats={seats} />
    </MatchTable>
  );
}

/** Whose turn it is, by the name on their phone, so the room knows who should be looking down. */
function TurnBanner({ view, seats }: { view: MatchView; seats: readonly TvSeat[] }) {
  const seat = seats.find(({ playerId }) => playerId === view.activePlayerId);
  if (!seat || view.winnerId !== null) return null;
  const controller = seat.controllerName ?? seat.lastController;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center px-4 sm:top-6">
      <p className="hud-panel px-5 py-2 text-center text-lg font-black tracking-wide">
        Vez de <span className="text-orange-400">{controller ?? seat.playerName}</span>
        {controller && <span className="ml-2 text-sm font-semibold text-zinc-400">({seat.playerName})</span>}
      </p>
    </div>
  );
}

/** Seats without a phone right now: dropped mid-match (reconnecting restores them) or never taken. */
function PresenceNotes({ seats }: { seats: readonly TvSeat[] }) {
  const empty = seats.filter(({ controllerName }) => controllerName === null);
  if (empty.length === 0) return null;
  return (
    <div className="pointer-events-none absolute top-20 right-4 z-30 flex flex-col items-end gap-2 sm:top-24 sm:right-6">
      {empty.map((seat) => (
        <p
          key={seat.playerId}
          role="status"
          className="hud-panel border-red-400/40 px-4 py-2 text-base font-bold text-red-200"
        >
          {seat.lastController ? `${seat.lastController} desconectou` : `${seat.playerName} está sem celular`}
          <span className="block text-xs font-semibold text-zinc-400">
            {seat.lastController ? `${seat.playerName} · esperando voltar` : "abra o controle para jogar"}
          </span>
        </p>
      ))}
    </div>
  );
}
