import type { Metadata } from "next";
import { CharactersScreen } from "@/features/codex/CharactersScreen";

export const metadata: Metadata = { title: "Personagens · Battle Dice" };

export default async function CharactersPage({ searchParams }: { searchParams: Promise<{ personagem?: string }> }) {
  const { personagem } = await searchParams;
  return <CharactersScreen initial={personagem} />;
}
