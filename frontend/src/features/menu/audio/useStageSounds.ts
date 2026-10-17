"use client";

import { useEffect, useState } from "react";
import { AudioEngine } from "@/features/match/audio/audioEngine";
import { preferences, usePreference } from "@/features/settings/preferences";
import { StageSounds } from "./stageSounds";

/**
 * Sounds for the menu's character stage: its own engine (sound effects only, no music), silenced
 * by the global mute. Browsers only let it play once the page has had a click or key press: on a
 * fresh load the first intro plays in silence (clicking the figure plays it again, see CharacterStage).
 */
export function useStageSounds(): StageSounds {
  const [engine] = useState(() => new AudioEngine());
  const [sounds] = useState(() => new StageSounds(engine));
  const muted = usePreference(preferences.muted);

  useEffect(() => engine.setMuted(muted), [engine, muted]);
  useEffect(() => {
    const unlock = () => engine.unlock();
    // Arriving from a menu click (the page was already interacted with), it can start right away;
    // on a fresh load the browser holds it until the first click or key press.
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
