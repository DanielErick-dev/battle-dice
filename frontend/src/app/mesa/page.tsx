import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseCharacterList } from "@/features/characters";
import { ClientTvScreen } from "@/features/party/tv/ClientTvScreen";
import { newRoomCode, parseRoomCode } from "@/features/shared/party/roomCode";
import { boardPresetFor } from "@/features/shared/presets/boards";
import { mapPresetFor } from "@/features/shared/presets/maps";
import { lanOrigin } from "./lanOrigin";

export const metadata: Metadata = { title: "Modo festa · Battle Dice" };

interface TvPageProps {
  searchParams: Promise<{
    sala?: string;
    tabuleiro?: string;
    mapa?: string;
    jogadores?: string;
    carregadas?: string;
    bots?: string;
  }>;
}

// Without a valid room code a fresh one is drawn into the URL, so a reload keeps the same room.
export default async function TvPage({ searchParams }: TvPageProps) {
  const params = await searchParams;
  const { sala, tabuleiro = "", mapa = "", jogadores = "", carregadas, bots = "" } = params;
  const code = parseRoomCode(sala);
  if (!code) {
    const query = new URLSearchParams({ ...params, sala: newRoomCode() });
    redirect(`/mesa?${query.toString()}`);
  }
  const boardId = boardPresetFor(tabuleiro).id;
  const mapId = mapPresetFor(mapa).id;
  const characters = parseCharacterList(jogadores);
  const chargedAbilities = carregadas === "1";
  // `bots=2,3`: seats the TV plays (1-based, as on the setup screen); they can still be changed in the lobby.
  const botSeats = bots
    .split(",")
    .map((seatNumber) => Number(seatNumber) - 1)
    .filter((index) => Number.isInteger(index) && index >= 0 && index < characters.length);

  return (
    <ClientTvScreen
      key={`${code}:${boardId}:${mapId}:${characters.join(",")}:${chargedAbilities}:${botSeats.join(",")}`}
      code={code}
      boardId={boardId}
      mapId={mapId}
      characters={characters}
      chargedAbilities={chargedAbilities}
      bots={botSeats}
      lanOrigin={lanOrigin((await headers()).get("host"))}
    />
  );
}
