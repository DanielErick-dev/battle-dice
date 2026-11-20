import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { joinPartyOnChannel } from "@/game/application/party";
import type { PlayerId } from "@/game/domain/types";
import { ControllerConnection, type ConnectionStatus } from "../model/connection";
import { joinRefusalMessage } from "../model/seats";
import { PhoneMatch } from "./PhoneMatch";
import { PHONE } from "./phoneStyles";

interface PhoneControllerProps {
  room: string;
  seat: PlayerId;
  name: string;
  clientId: string;
  /** Back to the join screen, with why. */
  onLeave: (notice: string | null) => void;
}

const CLOSED_TEXT: Readonly<Record<Extract<ConnectionStatus, { kind: "closed" }>["reason"], string>> = {
  HOST_CLOSED: "A TV encerrou a partida.",
  SEAT_RELEASED: "A TV liberou o seu lugar.",
  SEAT_LOST: "Outro celular pegou o seu lugar enquanto você estava fora.",
};

/** One seated phone: its connection to the room and what to show for each state of it. */
export function PhoneController({ room, seat, name, clientId, onLeave }: PhoneControllerProps) {
  const [connection] = useState(
    () => new ControllerConnection(joinPartyOnChannel(room, { clientId, role: "player", seat, name })),
  );
  const status = useSyncExternalStore(connection.subscribe, connection.getStatus, connection.getStatus);

  useEffect(() => {
    connection.start();
    return connection.dispose;
  }, [connection]);

  // A phone that slept or switched apps catches up as soon as it's looked at again.
  useEffect(() => {
    const wake = () => {
      if (document.visibilityState === "visible") connection.resync();
    };
    // BroadcastChannel can't tell a closed tab: leaving says so, and the TV shows "<nome> desconectou".
    const leave = () => connection.dispose();
    // Back from the browser's page cache the link is gone; a reload rejoins the saved seat.
    const back = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", connection.retryNow);
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", back);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", connection.retryNow);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", back);
    };
  }, [connection]);

  useEffect(() => {
    if (status.kind === "failed") onLeave(joinRefusalMessage(status.reason));
    if (status.kind === "closed") onLeave(CLOSED_TEXT[status.reason]);
  }, [status, onLeave]);

  if (status.kind === "connecting" || status.kind === "failed" || status.kind === "closed") {
    return (
      <main className={PHONE.screen}>
        <p className="m-auto text-sm tracking-widest text-zinc-200 uppercase">Entrando na sala {room}…</p>
      </main>
    );
  }

  return (
    <>
      <PhoneMatch store={connection.store} room={room} onLeave={() => onLeave(null)} />
      {status.kind === "reconnecting" && (
        <div
          role="alertdialog"
          aria-label="Reconectando"
          className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <section className="hud-panel flex w-full max-w-sm flex-col items-center gap-3 p-6 text-center">
            <WifiOff className="size-10 text-amber-300" />
            <h2 className="text-lg font-black tracking-wider text-amber-200 uppercase">Reconectando…</h2>
            <p className="text-sm text-zinc-100">
              A TV não respondeu. Tentando de novo (tentativa {status.attempt}). O seu lugar continua guardado.
            </p>
            <button type="button" onClick={connection.retryNow} className={PHONE.secondary}>
              Tentar agora
            </button>
            <button
              type="button"
              onClick={() => onLeave(null)}
              className="text-xs font-bold tracking-wider text-zinc-200 uppercase underline-offset-4 hover:underline"
            >
              Voltar ao início
            </button>
          </section>
        </div>
      )}
    </>
  );
}
