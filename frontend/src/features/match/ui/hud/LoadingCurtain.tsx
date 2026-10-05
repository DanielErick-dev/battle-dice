"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

/** Share of the bar the files fill; the rest creeps along while the effects are prepared. */
const FILES_SHARE = 0.7;
/** Where the bar creeps to while the effects are prepared, and how long it takes to get there. */
const PREPARING_SHARE = 0.95;
const PREPARING_SECONDS = 4;

/**
 * Covers the match until the scene is ready (models loaded, shaders compiled on the GPU): a longer
 * wait up front instead of stalls mid-match. The bar fills in two stages: the files (none when the
 * browser already has them), then the effects being prepared, which can't be measured, so it creeps.
 */
export function LoadingCurtain({ ready }: { ready: boolean }) {
  const { progress, active } = useProgress();
  // The bar starts empty and moves from the next frame on, so it's seen filling even when the
  // files are already there.
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const loadingFiles = active && progress < 100;
  const filled = !started ? 0 : ready ? 1 : loadingFiles ? (progress / 100) * FILES_SHARE : PREPARING_SHARE;

  return (
    <div
      aria-hidden={ready}
      className={`absolute inset-0 z-50 grid place-items-center bg-[#05060b] transition-opacity duration-700 ${
        ready ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex w-64 flex-col items-center gap-4">
        <h2 className="text-2xl font-black tracking-[0.2em] uppercase">
          Battle <span className="text-orange-500">Dice</span>
        </h2>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={Math.round(filled * 100)}
        >
          <div
            className="h-full rounded-full bg-orange-500 transition-[width] ease-out"
            style={{
              width: `${Math.max(4, filled * 100)}%`,
              transitionDuration: loadingFiles || ready ? "300ms" : `${PREPARING_SECONDS}s`,
            }}
          />
        </div>
        <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
          {loadingFiles ? `Carregando arena… ${Math.round(progress)}%` : "Preparando efeitos…"}
        </p>
      </div>
    </div>
  );
}
