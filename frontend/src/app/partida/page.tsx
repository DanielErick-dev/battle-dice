import type { Metadata } from "next";
import { boardPresetFor } from "@/features/match/boards";
import { parseCharacterList } from "@/features/match/characters";
import { mapPresetFor } from "@/features/match/maps";
import { ClientMatchScreen } from "@/features/match/ui/ClientMatchScreen";

export const metadata: Metadata = { title: "Partida · Battle Dice" };

interface MatchPageProps {
  searchParams: Promise<{
    tabuleiro?: string;
    mapa?: string;
    jogadores?: string;
    personagem?: string;
    carregadas?: string;
  }>;
}

// /partida?tabuleiro=training&mapa=dungeon&jogadores=witch,zarek&carregadas=1 (legacy `personagem` for one player).
// Unknown or locked values fall back to the defaults.
export default async function MatchPage({ searchParams }: MatchPageProps) {
  const { tabuleiro = "", mapa = "", jogadores, personagem = "", carregadas } = await searchParams;
  const boardId = boardPresetFor(tabuleiro).id;
  const mapId = mapPresetFor(mapa).id;
  const characters = parseCharacterList(jogadores ?? personagem);
  const chargedAbilities = carregadas === "1";

  // Keyed so that starting another match from the same page gets a fresh store.
  return (
    <ClientMatchScreen
      key={`${boardId}:${mapId}:${characters.join(",")}:${chargedAbilities}`}
      boardId={boardId}
      mapId={mapId}
      characters={characters}
      chargedAbilities={chargedAbilities}
    />
  );
}
