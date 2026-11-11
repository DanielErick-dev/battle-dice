import type { Metadata } from "next";
import { boardPresetFor } from "@/features/shared/presets/boards";
import { parseCharacterList } from "@/features/characters";
import { mapPresetFor } from "@/features/shared/presets/maps";
import { ClientMatchScreen } from "@/features/match/ui/ClientMatchScreen";

export const metadata: Metadata = { title: "Partida · Battle Dice" };

interface MatchPageProps {
  searchParams: Promise<{
    tabuleiro?: string;
    mapa?: string;
    jogadores?: string;
    personagem?: string;
    carregadas?: string;
    ampulheta?: string;
    assento?: string;
  }>;
}

// /partida?tabuleiro=training&mapa=dungeon&jogadores=witch,zarek&carregadas=1&ampulheta=0 (legacy `personagem` for one player).
// Unknown or locked values fall back to the defaults. In development, `assento=p2` pins the screen to the second player.
export default async function MatchPage({ searchParams }: MatchPageProps) {
  const { tabuleiro = "", mapa = "", jogadores, personagem = "", carregadas, ampulheta, assento } = await searchParams;
  const boardId = boardPresetFor(tabuleiro).id;
  const mapId = mapPresetFor(mapa).id;
  const characters = parseCharacterList(jogadores ?? personagem);
  const chargedAbilities = carregadas === "1";
  const hourglass = ampulheta !== "0";
  // Stands in for the seat a room server will hand out; never in a production build.
  const seat = process.env.NODE_ENV === "development" ? (assento ?? null) : null;

  // Keyed so that starting another match from the same page gets a fresh store.
  return (
    <ClientMatchScreen
      key={`${boardId}:${mapId}:${characters.join(",")}:${chargedAbilities}:${hourglass}:${seat}`}
      boardId={boardId}
      mapId={mapId}
      characters={characters}
      chargedAbilities={chargedAbilities}
      hourglass={hourglass}
      seat={seat}
    />
  );
}
