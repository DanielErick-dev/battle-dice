import type { Metadata } from "next";
import { boardPresetFor } from "@/features/match/boards";
import { DEFAULT_CHARACTER_ID, isPlayableCharacter } from "@/features/match/characters";
import { ClientMatchScreen } from "@/features/match/ui/ClientMatchScreen";

export const metadata: Metadata = { title: "Partida · Battle Dice" };

interface MatchPageProps {
  searchParams: Promise<{ tabuleiro?: string; personagem?: string }>;
}

/** /partida?tabuleiro=training&personagem=crimsonWitch — unknown or locked values fall back to the defaults. */
export default async function MatchPage({ searchParams }: MatchPageProps) {
  const { tabuleiro = "", personagem = "" } = await searchParams;
  const boardId = boardPresetFor(tabuleiro).id;
  const characterId = isPlayableCharacter(personagem) ? personagem : DEFAULT_CHARACTER_ID;

  // Keyed so that starting another match from the same page gets a fresh store.
  return <ClientMatchScreen key={`${boardId}:${characterId}`} boardId={boardId} characterId={characterId} />;
}
