"use client";

import dynamic from "next/dynamic";

/** Browser only: the TV hosts the match (BroadcastChannel, a random seed) and shows the 3D board. */
export const ClientTvScreen = dynamic(() => import("./TvScreen").then((module) => module.TvScreen), {
  ssr: false,
  loading: () => (
    <main className="grid h-dvh place-items-center bg-[#05060b] text-sm tracking-widest text-zinc-500 uppercase">
      Abrindo a sala…
    </main>
  ),
});
