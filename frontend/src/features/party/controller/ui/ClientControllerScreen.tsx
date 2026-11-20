"use client";

import dynamic from "next/dynamic";

/** Browser only: the client id lives in sessionStorage and the room is a BroadcastChannel (later a WebSocket). */
export const ClientControllerScreen = dynamic(
  () => import("./ControllerScreen").then((module) => module.ControllerScreen),
  {
    ssr: false,
    loading: () => (
      <main className="grid h-dvh place-items-center bg-[#05060b] text-sm tracking-widest text-zinc-300 uppercase">
        Carregando controle…
      </main>
    ),
  },
);
