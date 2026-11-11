"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { hostPartyOnChannel } from "@/game/application/party";
import { createGame } from "@/game/domain/core/engine";
import { rosterOf, type CharacterId } from "@/features/characters";
import { preloadCharacterModel } from "@/features/characters/core/CharacterModel";
import { preloadChairs } from "@/features/characters/accessories/chairs";
import { useGameAudio } from "@/features/match/hooks/useGameAudio";
import { chairsOf, modelsOf } from "@/features/match/ui/screen/characterAssets";
import { boardPresetFor } from "@/features/shared/presets/boards";
import type { MapId } from "@/features/shared/presets/maps";
import { PartyRoom } from "./partyRoom";
import { TvLobby } from "./TvLobby";
import { TvMatch } from "./TvMatch";

interface TvScreenProps {
  /** The room code, already parsed (see parseRoomCode). */
  code: string;
  boardId: string;
  mapId: MapId;
  characters: readonly CharacterId[];
  chargedAbilities: boolean;
}

/** Scales every rem on the page while the TV screen is up: the HUD is read from a sofa (see globals.css). */
function useTvScale(): void {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("party-tv");
    return () => root.classList.remove("party-tv");
  }, []);
}

/** The party TV: hosts the match in this tab, shows the lobby until everyone is seated, then the board as a spectator. */
export function TvScreen({ code, boardId, mapId, characters, chargedAbilities }: TvScreenProps) {
  const preset = boardPresetFor(boardId);
  const [roster] = useState(() => rosterOf(characters));
  const [room] = useState(() => {
    // The TV tab hosts the match, so it picks the seed; the room server will once it exists.
    const state = createGame(preset.definition, roster, {
      seed: Math.floor(Math.random() * 2 ** 32),
      chargedAbilities,
    });
    return new PartyRoom(() => hostPartyOnChannel(code, state));
  });
  const { host, seats } = useSyncExternalStore(room.subscribe, room.getSnapshot, room.getSnapshot);
  const [started, setStarted] = useState(false);
  const audio = useGameAudio();
  useTvScale();
  useEffect(() => {
    room.open();
    return room.close;
  }, [room]);
  // Fetched during the lobby, so the board is ready sooner once it starts.
  useEffect(() => roster.flatMap(({ character }) => modelsOf(character)).forEach(preloadCharacterModel), [roster]);
  useEffect(() => preloadChairs(roster.flatMap(({ character }) => chairsOf(character))), [roster]);

  if (!host) {
    return (
      <main className="grid h-dvh place-items-center bg-[#05060b] text-sm tracking-widest text-zinc-500 uppercase">
        Abrindo a sala…
      </main>
    );
  }
  if (!started) return <TvLobby code={code} seats={seats} roster={roster} onStart={() => setStarted(true)} />;
  return <TvMatch host={host} code={code} seats={seats} preset={preset} mapId={mapId} roster={roster} audio={audio} />;
}
