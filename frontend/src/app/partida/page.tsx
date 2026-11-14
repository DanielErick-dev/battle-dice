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
    bots?: string;
  }>;
}

// Unknown or locked values fall back to the defaults; in development `assento=p2` pins the screen to a seat.
export default async function MatchPage({ searchParams }: MatchPageProps) {
  const {
    tabuleiro = "",
    mapa = "",
    jogadores,
    personagem = "",
    carregadas,
    ampulheta,
    assento,
    bots = "",
  } = await searchParams;
  const boardId = boardPresetFor(tabuleiro).id;
  const mapId = mapPresetFor(mapa).id;
  const characters = parseCharacterList(jogadores ?? personagem);
  const chargedAbilities = carregadas === "1";
  const hourglass = ampulheta !== "0";
  // `bots=2,3`: the computer plays those seats (1-based, as on the setup screen).
  const botSeats = bots
    .split(",")
    .map((seatNumber) => Number(seatNumber) - 1)
    .filter((index) => Number.isInteger(index) && index >= 0 && index < characters.length);
  // Stands in for the seat a room server will hand out; never in a production build.
  const seat = process.env.NODE_ENV === "development" ? (assento ?? null) : null;

  // Keyed so that starting another match from the same page gets a fresh store.
  return (
    <ClientMatchScreen
      key={`${boardId}:${mapId}:${characters.join(",")}:${chargedAbilities}:${hourglass}:${seat}:${botSeats.join(",")}`}
      boardId={boardId}
      mapId={mapId}
      characters={characters}
      chargedAbilities={chargedAbilities}
      hourglass={hourglass}
      seat={seat}
      bots={botSeats}
    />
  );
}
