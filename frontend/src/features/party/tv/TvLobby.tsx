"use client";

import { ArrowLeft, Bot, ExternalLink, Play, Smartphone } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { CHARACTERS, type RosterEntry } from "@/features/characters";
import { cn } from "@/lib/utils";
import { everySeatTaken, type TvSeat } from "./partyRoom";

interface TvLobbyProps {
  code: string;
  seats: readonly TvSeat[];
  roster: readonly RosterEntry[];
  /** This machine's address on the home network (see app/mesa/lanOrigin.ts). */
  lanOrigin: string | null;
  onStart: () => void;
  /** Hands the seat to the computer, or back to the phones. */
  onToggleComputer: (seat: TvSeat) => void;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
/** Phones on other devices reach the room through the dev relay (npm run dev:party); without it, only this browser. */
const ACROSS_DEVICES = Boolean(process.env.NEXT_PUBLIC_WS_URL);

/** Where each phone opens the controller: on localhost a phone can't follow it, so the home-network address instead. */
function controllerUrl(code: string, lanOrigin: string | null): string {
  const origin = LOCAL_HOSTS.has(window.location.hostname) && lanOrigin ? lanOrigin : window.location.origin;
  return `${origin}/controle?sala=${encodeURIComponent(code)}`;
}

/** Before the match: the room code and QR for the phones, who has joined, and the start button. */
export function TvLobby({ code, seats, roster, lanOrigin, onStart, onToggleComputer }: TvLobbyProps) {
  const url = controllerUrl(code, lanOrigin);
  const ready = everySeatTaken(seats);
  const missing = seats.filter(({ controllerName }) => controllerName === null).length;

  return (
    <main className="relative min-h-dvh w-full overflow-x-clip bg-[radial-gradient(ellipse_at_70%_20%,#2e1f5e_0%,#120e2a_45%,#05060b_80%)] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center gap-3">
          <Link
            href="/jogar"
            aria-label="Voltar à escolha da partida"
            className="grid size-10 place-items-center rounded-xl bg-white/5 text-zinc-300 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl leading-none font-black tracking-[0.15em] uppercase sm:text-3xl">
              Modo <span className="text-orange-500">festa</span>
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">A TV mostra o tabuleiro; cada um joga pelo celular.</p>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section aria-labelledby="room-title" className="flex flex-col items-center gap-5 text-center">
            <h2 id="room-title" className="text-xs font-bold tracking-[0.3em] text-zinc-400 uppercase">
              Código da sala
            </h2>
            <p className="font-mono text-7xl font-black tracking-[0.3em] text-amber-200 drop-shadow-[0_0_30px_rgba(251,191,36,0.35)] sm:text-8xl">
              {code}
            </p>
            <div className="rounded-2xl bg-white p-3 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
              <QRCodeSVG value={url} size={220} marginSize={1} title={`Abrir o controle da sala ${code}`} />
            </div>
            <p className="text-sm text-zinc-300">
              Aponte a câmera do celular para o código ou abra <span className="font-mono text-amber-200">{url}</span>
            </p>
            <div className="flex max-w-md flex-col gap-3 rounded-2xl bg-white/[0.04] p-4 text-left text-sm text-zinc-300 ring-1 ring-white/10">
              {ACROSS_DEVICES ? (
                <p>
                  <span className="font-bold text-white">Celulares no mesmo Wi-Fi deste computador.</span> Escaneie o QR
                  code e o controle já abre nesta sala. Também dá para jogar numa aba deste navegador.
                </p>
              ) : (
                <p>
                  <span className="font-bold text-white">Só neste navegador.</span> Sem o relay, cada controle é uma aba
                  (ou janela) deste mesmo navegador. Para entrar pelo celular, rode{" "}
                  <span className="font-mono text-amber-200">npm run dev:party</span>.
                </p>
              )}
              <button
                type="button"
                onClick={() => window.open(url, "_blank")}
                className="flex w-fit items-center gap-2 rounded-xl px-3 py-2 font-bold text-amber-200 ring-1 ring-amber-300/40 hover:bg-amber-300/10"
              >
                <ExternalLink className="size-4" /> Abrir um controle em nova aba
              </button>
            </div>
          </section>

          <section aria-labelledby="seats-title" className="flex flex-col gap-4">
            <h2 id="seats-title" className="text-xs font-bold tracking-[0.3em] text-zinc-400 uppercase">
              Jogadores
            </h2>
            <ul className="flex flex-col gap-2">
              {seats.map((seat, index) => {
                const character = roster.find(({ id }) => id === seat.playerId)?.character;
                const color = character ? CHARACTERS[character].color : "#a1a1aa";
                const joined = seat.controllerName !== null;
                const status = seat.computer ? (
                  <>
                    <Bot className="size-4" /> computador
                  </>
                ) : (
                  <>
                    <Smartphone className="size-4" />
                    {joined ? seat.controllerName : "aguardando celular…"}
                  </>
                );
                return (
                  <li
                    key={seat.playerId}
                    className={cn(
                      "flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 ring-1 transition",
                      seat.computer
                        ? "bg-sky-500/10 ring-sky-400/50"
                        : joined
                          ? "bg-emerald-500/10 ring-emerald-400/50"
                          : "bg-white/[0.04] ring-white/10",
                    )}
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                    />
                    <span className="text-sm font-black tracking-widest text-zinc-400">J{index + 1}</span>
                    <span className="text-lg font-bold tracking-wide uppercase">{seat.playerName}</span>
                    <span
                      className={cn(
                        "ml-auto flex items-center gap-2 text-base",
                        seat.computer
                          ? "font-bold text-sky-300"
                          : joined
                            ? "font-bold text-emerald-300"
                            : "text-zinc-500",
                      )}
                    >
                      {status}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleComputer(seat)}
                      aria-pressed={seat.computer}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold tracking-wider uppercase ring-1 transition-colors",
                        seat.computer
                          ? "bg-sky-500/20 text-sky-200 ring-sky-400/60 hover:bg-sky-500/30"
                          : "text-zinc-400 ring-white/15 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Bot className="size-3.5" /> Bot
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={onStart}
              disabled={!ready}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-orange-600 px-10 text-lg font-black tracking-wider uppercase shadow-[0_10px_40px_rgba(234,88,12,0.45)] transition enabled:hover:bg-orange-500 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Play className="size-5 fill-current" />
              Começar
            </button>
            {!ready && (
              <p className="text-center text-sm text-zinc-400">
                {missing === 1 ? "Falta 1 celular entrar." : `Faltam ${missing} celulares entrar.`}
              </p>
            )}
            {/* Dev escape hatch: look at the board with seats still empty (the match waits on them). */}
            {process.env.NODE_ENV === "development" && !ready && (
              <button
                type="button"
                onClick={onStart}
                className="w-fit self-center rounded-lg px-3 py-1.5 text-xs text-zinc-500 ring-1 ring-white/10 hover:text-zinc-300"
              >
                Dev: começar com assentos vazios
              </button>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
