"use client";

import { Hourglass as HourglassIcon, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Each turn's time to think; out of it, the turn is lost. */
export const TURN_SECONDS = 60;
/** How many times each player may stop the match. */
export const PAUSES_PER_PLAYER = 3;
/** Under this the sand runs red. */
const HURRY_SECONDS = 10;

/**
 * Seconds left of the turn `turnKey`, counting down only while `running` (the player thinking: nothing animating,
 * no prompt, not paused); `onTimeout` fires once when it runs out.
 */
export function useHourglass({
  enabled,
  running,
  turnKey,
  onTimeout,
}: {
  enabled: boolean;
  running: boolean;
  turnKey: string;
  onTimeout: () => void;
}): number {
  // Kept with the turn it belongs to: a new turn reads as a full glass without resetting anything.
  const [shown, setShown] = useState({ turnKey, left: TURN_SECONDS });
  const clock = useRef({ turnKey, remaining: TURN_SECONDS * 1000, timedOut: false });
  const timeout = useRef(onTimeout);
  useEffect(() => {
    timeout.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled || !running) return;
    if (clock.current.turnKey !== turnKey) clock.current = { turnKey, remaining: TURN_SECONDS * 1000, timedOut: false };
    let last = performance.now();
    const tick = setInterval(() => {
      const now = performance.now();
      const current = clock.current;
      current.remaining -= now - last;
      last = now;
      setShown({ turnKey, left: Math.max(0, Math.ceil(current.remaining / 1000)) });
      if (current.remaining <= 0 && !current.timedOut) {
        current.timedOut = true;
        timeout.current();
      }
    }, 200);
    return () => clearInterval(tick);
  }, [enabled, running, turnKey]);

  return shown.turnKey === turnKey ? shown.left : TURN_SECONDS;
}

/** The turn's sand, and the button that stops the match (with how many pauses the player has left). */
export function HourglassPanel({
  seconds,
  running,
  pausesLeft,
  onPause,
}: {
  seconds: number;
  running: boolean;
  pausesLeft: number;
  onPause: () => void;
}) {
  const hurry = seconds <= HURRY_SECONDS;
  return (
    <div className="hud-panel pointer-events-auto flex items-center gap-3 px-3 py-2">
      <div
        className={cn("flex items-center gap-1.5", hurry && running && "animate-pulse")}
        title="Ampulheta: o tempo só corre enquanto você pensa. Acabou, você perde a vez."
      >
        <HourglassIcon className={cn("size-4", hurry ? "text-red-400" : "text-amber-300", !running && "opacity-50")} />
        <span
          className={cn(
            "w-8 font-mono text-sm font-black tabular-nums",
            hurry ? "text-red-300" : "text-amber-100",
            !running && "opacity-60",
          )}
        >
          {seconds}s
        </span>
        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
          <span
            className={cn(
              "block h-full rounded-full transition-[width] duration-200",
              hurry ? "bg-red-400" : "bg-amber-300",
            )}
            style={{ width: `${(seconds / TURN_SECONDS) * 100}%` }}
          />
        </span>
      </div>
      <button
        type="button"
        onClick={onPause}
        disabled={pausesLeft === 0}
        title={pausesLeft > 0 ? `Pausar a partida (${pausesLeft} restantes)` : "Sem pausas restantes"}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black tracking-wider text-zinc-200 uppercase ring-1 ring-white/15 transition hover:bg-white/10 disabled:opacity-35"
      >
        <Pause className="size-3" /> Pausar · {pausesLeft}
      </button>
    </div>
  );
}

/** Over everything while the match is stopped: who stopped it and the way back in. */
export function PauseOverlay({
  name,
  pausesLeft,
  onResume,
}: {
  name: string;
  pausesLeft: number;
  onResume: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-4xl font-black tracking-[0.3em] text-white uppercase">Pausado</p>
        <p className="text-sm text-zinc-300">
          {name} pausou a partida · {pausesLeft} {pausesLeft === 1 ? "pausa restante" : "pausas restantes"}
        </p>
        <button
          type="button"
          onClick={onResume}
          className="flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-black tracking-wider text-white uppercase transition hover:bg-orange-500 active:scale-95"
        >
          <Play className="size-4" /> Continuar
        </button>
      </div>
    </div>
  );
}
