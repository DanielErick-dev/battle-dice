"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { connectMatchAudio } from "../audio/matchAudio";
import { SynthSounds } from "../audio/soundEffects";
import type { MatchStore } from "../model/matchStore";

const MUTED_KEY = "battle-dice:muted";

export interface MatchAudioControls {
  muted: boolean;
  toggleMuted: () => void;
}

/** Wires sound effects to a match. The first pointer or key press unlocks audio. */
export function useMatchAudio(store: MatchStore): MatchAudioControls {
  const [sounds] = useState(() => new SynthSounds());
  const muted = useSyncExternalStore(mutedPreference.subscribe, mutedPreference.get, () => false);

  useEffect(() => connectMatchAudio(store, sounds), [store, sounds]);

  useEffect(() => sounds.setMuted(muted), [sounds, muted]);

  useEffect(() => {
    const unlock = () => sounds.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [sounds]);

  return { muted, toggleMuted: () => mutedPreference.set(!muted) };
}

/** Mute switch remembered per browser. Storage can be blocked, so it falls back to memory. */
const mutedPreference = (() => {
  const listeners = new Set<() => void>();
  let memory = false;

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get(): boolean {
      try {
        return window.localStorage.getItem(MUTED_KEY) === "1";
      } catch {
        return memory;
      }
    },
    set(muted: boolean) {
      memory = muted;
      try {
        window.localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
      } catch {
        // Keep the in-memory value for this session.
      }
      listeners.forEach((listener) => listener());
    },
  };
})();
