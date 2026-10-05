import type { Metadata } from "next";
import { boardPresetFor } from "@/features/match/boards";
import { parseCharacterList } from "@/features/match/characters";
import { ClientMatchScreen } from "@/features/match/ui/ClientMatchScreen";

export const metadata: Metadata = { title: "Partida · Battle Dice" };

interface MatchPageProps {
  searchParams: Promise<{ tabuleiro?: string; jogadores?: string; personagem?: string; carregadas?: string }>;
}

/**
 * /partida?tabuleiro=training&jogadores=crimsonWitch,voidKnight&carregadas=1 — one player per
 * character, in turn order (`personagem` still works for one); `carregadas=1` starts every ability
 * charged. Unknown or locked values fall back to the defaults.
 */
export default async function MatchPage({ searchParams }: MatchPageProps) {
  const { tabuleiro = "", jogadores, personagem = "", carregadas } = await searchParams;
  const boardId = boardPresetFor(tabuleiro).id;
  const characters = parseCharacterList(jogadores ?? personagem);
  const chargedAbilities = carregadas === "1";

  // Keyed so that starting another match from the same page gets a fresh store.
  return (
    <ClientMatchScreen
      key={`${boardId}:${characters.join(",")}:${chargedAbilities}`}
      boardId={boardId}
      characters={characters}
      chargedAbilities={chargedAbilities}
    />
  );
}
