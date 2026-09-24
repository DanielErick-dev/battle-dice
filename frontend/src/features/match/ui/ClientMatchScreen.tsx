"use client";

import dynamic from "next/dynamic";

/**
 * The match only renders in the browser: decks are shuffled when it is created, so a
 * server render would deal different cards than the client (a hydration mismatch), and
 * the 3D scene and audio are browser-only anyway.
 */
export const ClientMatchScreen = dynamic(() => import("./MatchScreen").then((module) => module.MatchScreen), {
  ssr: false,
  loading: () => (
    <main className="grid h-dvh place-items-center bg-[#05060b] text-sm tracking-widest text-zinc-500 uppercase">
      Carregando arena…
    </main>
  ),
});
