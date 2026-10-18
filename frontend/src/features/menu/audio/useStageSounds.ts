"use client";

import { useEffect, useState } from "react";
import { AudioEngine } from "@/features/match/audio/audioEngine";
import { preferences, usePreference } from "@/features/settings/preferences";
import { StageSounds } from "./stageSounds";

/** The menu stage's own audio engine (effects only), following the global mute. */
export function useStageSounds(): StageSounds {
  const [engine] = useState(() => new AudioEngine());
  const [sounds] = useState(() => new StageSounds(engine));
  const muted = usePreference(preferences.muted);

  useEffect(() => engine.setMuted(muted), [engine, muted]);
  useEffect(() => {
    const unlock = () => engine.unlock();
    // Works right away when arriving from a menu click; on a fresh load the browser holds it until the first input.
    unlock();
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
      engine.dispose();
    };
  }, [engine]);

  return sounds;
}
