"use client";

import { useState } from "react";
import type { PlayerId } from "@/game/domain/types";
import { browserStore, controllerId, saveName, savedName, savedSeat, saveSeat } from "../model/identity";
import { roomCodeFrom } from "../model/seats";
import { JoinPanel } from "./JoinPanel";
import { PhoneController } from "./PhoneController";

type Phase = { kind: "join"; notice: string | null } | { kind: "seated"; room: string; seat: PlayerId; name: string };

/** Keeps the room in the address so a refresh (or a shared link) lands in the same room. */
function rememberRoomInUrl(room: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("sala", room);
  window.history.replaceState(null, "", url);
}

/** The phone side of party mode: join a room and take a seat, then play from the phone. */
export function ControllerScreen({ room: roomParam }: { room: string }) {
  const initialRoom = roomCodeFrom(roomParam);
  const [clientId] = useState(() => controllerId(browserStore("sessionStorage")));
  const [phase, setPhase] = useState<Phase>(() => {
    const saved = initialRoom ? savedSeat(browserStore("sessionStorage"), initialRoom) : null;
    return saved ? { kind: "seated", ...saved } : { kind: "join", notice: null };
  });

  if (phase.kind === "seated") {
    return (
      <PhoneController
        key={`${phase.room}:${phase.seat}`}
        room={phase.room}
        seat={phase.seat}
        name={phase.name}
        clientId={clientId}
        onLeave={(notice) => {
          saveSeat(browserStore("sessionStorage"), null);
          setPhase({ kind: "join", notice });
        }}
      />
    );
  }

  return (
    <JoinPanel
      initialRoom={initialRoom ?? roomParam.toUpperCase()}
      initialName={savedName(browserStore("localStorage"))}
      clientId={clientId}
      notice={phase.notice}
      onSeat={(room, seat, name) => {
        saveName(browserStore("localStorage"), name);
        saveSeat(browserStore("sessionStorage"), { room, seat, name });
        rememberRoomInUrl(room);
        setPhase({ kind: "seated", room, seat, name });
      }}
    />
  );
}
