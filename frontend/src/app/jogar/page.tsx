import type { Metadata } from "next";
import { MatchSetupScreen } from "@/features/menu/ui/MatchSetupScreen";

export const metadata: Metadata = { title: "Nova partida · Battle Dice" };

export default function PlayPage() {
  return <MatchSetupScreen />;
}
