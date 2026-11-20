import { useState, type FormEvent } from "react";
import type { PlayerId } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { joinRefusalMessage, roomCodeFrom, seatOptions } from "../model/seats";
import { Avatar } from "./Avatar";
import { PHONE } from "./phoneStyles";
import { useRoomPeek } from "./useRoomPeek";

interface JoinPanelProps {
  initialRoom: string;
  initialName: string;
  clientId: string;
  /** Why the phone is back here (the match ended, the seat was lost…). */
  notice: string | null;
  onSeat: (room: string, seat: PlayerId, name: string) => void;
}

/** Room code and name, then the room's seats to tap one. */
export function JoinPanel({ initialRoom, initialName, clientId, notice, onSeat }: JoinPanelProps) {
  const [room, setRoom] = useState(initialRoom);
  const [name, setName] = useState(initialName);
  /** The room being looked into, once the form is sent. */
  const [peeking, setPeeking] = useState<{ room: string; name: string } | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const code = roomCodeFrom(room);
    if (!code || !name.trim()) return;
    setPeeking({ room: code, name: name.trim() });
  };

  return (
    <main className={PHONE.screen}>
      <div className={PHONE.column}>
        <header className="pt-4 pb-2 text-center">
          <h1 className="text-2xl font-black tracking-wider text-orange-400 uppercase">Battle Dice</h1>
          <p className="mt-1 text-sm text-zinc-200">Seu celular é o controle. O tabuleiro fica na TV.</p>
        </header>

        {notice && (
          <p role="status" className="hud-panel px-4 py-3 text-sm font-semibold text-amber-200">
            {notice}
          </p>
        )}

        {peeking ? (
          <SeatList
            room={peeking.room}
            name={peeking.name}
            clientId={clientId}
            onBack={() => setPeeking(null)}
            onSeat={(seat) => onSeat(peeking.room, seat, peeking.name)}
          />
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={PHONE.label}>Código da sala</span>
              <input
                value={room}
                onChange={(event) => setRoom(event.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                inputMode="text"
                maxLength={12}
                placeholder="ABCD"
                className={cn(PHONE.input, "text-center font-mono text-2xl tracking-[0.4em] uppercase")}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={PHONE.label}>Seu nome</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="nickname"
                maxLength={20}
                placeholder="Como te chamam na mesa"
                className={PHONE.input}
              />
            </label>
            <button type="submit" disabled={!roomCodeFrom(room) || !name.trim()} className={cn(PHONE.primary, "mt-2")}>
              Ver lugares
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

interface SeatListProps {
  room: string;
  name: string;
  clientId: string;
  onBack: () => void;
  onSeat: (seat: PlayerId) => void;
}

function SeatList({ room, name, clientId, onBack, onSeat }: SeatListProps) {
  const peek = useRoomPeek(room, clientId, name);
  const seats = peek.kind === "ready" ? seatOptions(peek.presence) : [];

  return (
    <section aria-label="Lugares" className="flex flex-col gap-3">
      <p className="text-center text-sm text-zinc-200">
        Sala <span className="font-mono font-black tracking-widest text-white">{room}</span>
      </p>

      {peek.kind === "loading" && <p className="py-8 text-center text-sm text-zinc-200">Procurando a sala…</p>}
      {peek.kind === "error" && (
        <p role="alert" className="hud-panel px-4 py-3 text-sm font-semibold text-red-200">
          {joinRefusalMessage(peek.reason)}
        </p>
      )}
      {peek.kind === "ready" && seats.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-200">Carregando os lugares…</p>
      )}

      {seats.length > 0 && (
        <>
          <h2 className={PHONE.label}>Escolha seu personagem</h2>
          <ul className="flex flex-col gap-2">
            {seats.map((seat) => (
              <li key={seat.playerId}>
                <button
                  type="button"
                  disabled={seat.takenBy !== null}
                  onClick={() => onSeat(seat.playerId)}
                  className={PHONE.row}
                >
                  <Avatar name={seat.character?.name ?? seat.playerName} color={seat.color} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-black">{seat.playerName}</span>
                    {seat.character && (
                      <span className="block truncate text-xs text-zinc-200">{seat.character.epithet}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider uppercase",
                      seat.takenBy ? "bg-white/10 text-zinc-200" : "bg-emerald-500/20 text-emerald-300",
                    )}
                  >
                    {seat.takenBy ? seat.takenBy : "Livre"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {seats.every((seat) => seat.takenBy !== null) && (
            <p className="text-center text-sm text-zinc-200">{joinRefusalMessage("ROOM_FULL")}</p>
          )}
        </>
      )}

      <button type="button" onClick={onBack} className={cn(PHONE.secondary, "mt-2")}>
        Trocar sala ou nome
      </button>
    </section>
  );
}
