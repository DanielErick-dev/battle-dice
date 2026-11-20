"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";

/** F9 shows or hides the meter; the choice is remembered on this browser. */
const TOGGLE_KEY = "F9";
const STORAGE_KEY = "battleDice.perfMeter";
const REFRESH_MS = 500;

function readShown(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveShown(shown: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, shown ? "1" : "0");
  } catch {
    // Private windows may refuse storage: the meter just starts hidden next time.
  }
}

/** Hidden frame-rate and GPU counters for playing with an eye on performance (see docs/otimizacao.md). */
export function PerfMeter({ quality }: { quality: string }) {
  const [shown, setShown] = useState(readShown);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== TOGGLE_KEY) return;
      event.preventDefault();
      setShown((was) => {
        saveShown(!was);
        return !was;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return shown ? <Meter quality={quality} /> : null;
}

function Meter({ quality }: { quality: string }) {
  const get = useThree((state) => state.get);
  const panel = useRef<HTMLDivElement | null>(null);
  const stats = useRef({ start: 0, frames: 0, worst: 0, last: 0 });

  useEffect(() => {
    const { info } = get().gl;
    const div = document.createElement("div");
    div.style.cssText =
      "position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:60;pointer-events:none;" +
      "font:12px/1.35 ui-monospace,monospace;color:#d8f3dc;background:rgba(8,10,14,.78);" +
      "padding:6px 10px;border-radius:6px;white-space:pre";
    document.body.appendChild(div);
    panel.current = div;
    // The effect composer renders several passes a frame: counting is reset once per frame instead.
    info.autoReset = false;
    return () => {
      div.remove();
      info.autoReset = true;
    };
  }, [get]);

  // Runs first in the frame: reads what the previous frame drew, then starts counting this one.
  useFrame(({ gl }) => {
    const now = performance.now();
    const w = stats.current;
    const { render, memory, programs } = gl.info;
    if (w.last > 0) {
      w.frames += 1;
      w.worst = Math.max(w.worst, now - w.last);
    }
    w.last = now;
    if (w.start === 0) w.start = now;
    const elapsed = now - w.start;
    if (elapsed >= REFRESH_MS && panel.current) {
      const fps = (w.frames * 1000) / elapsed;
      panel.current.textContent =
        `${fps.toFixed(0)} fps  ${(elapsed / Math.max(w.frames, 1)).toFixed(1)} ms  pior ${w.worst.toFixed(0)} ms\n` +
        `desenhos ${render.calls}  triângulos ${(render.triangles / 1000).toFixed(0)}k\n` +
        `shaders ${programs?.length ?? 0}  geometrias ${memory.geometries}  texturas ${memory.textures}\n` +
        `dpr ${gl.getPixelRatio().toFixed(2)}  qualidade ${quality}`;
      w.start = now;
      w.frames = 0;
      w.worst = 0;
    }
    gl.info.reset();
  }, -1000);

  return null;
}
