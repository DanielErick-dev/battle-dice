import type { Metadata, Viewport } from "next";
import { ClientControllerScreen } from "@/features/party/controller/ui/ClientControllerScreen";

export const metadata: Metadata = { title: "Controle · Battle Dice" };

// A phone held in one hand: no pinch zoom fighting the buttons.
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#05060b" };

interface ControllerPageProps {
  searchParams: Promise<{ sala?: string }>;
}

// /controle?sala=ABCD: the phone side of party mode (the TV shows the board at /mesa).
export default async function ControllerPage({ searchParams }: ControllerPageProps) {
  const { sala = "" } = await searchParams;
  return <ClientControllerScreen room={sala} />;
}
