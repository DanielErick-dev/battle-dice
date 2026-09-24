"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Ambience } from "../audio/ambience";
import { AudioEngine } from "../audio/audioEngine";
import { GenerativeMusic } from "../audio/music";
import { SynthSounds } from "../audio/soundEffects";

export interface GameAudio {
  sounds: SynthSounds;
  muted: boolean;
  toggleMuted: () => void;
  musicOn: boolean;
  toggleMusic: () => void;
}

/**
 * Audio for the whole session: one engine, background music and ambience, plus the
 * mute and music switches (remembered per browser). The first pointer or key press
 * unlocks audio, which starts the music.
 */
export function useGameAudio(): GameAudio {
  const [engine] = useState(() => new AudioEngine());
  const [sounds] = useState(() => new SynthSounds(engine));
  const [music] = useState(() => new GenerativeMusic(engine));
  const [ambience] = useState(() => new Ambience(engine));
  const muted = useSyncExternalStore(mutedPreference.subscribe, mutedPreference.get, () => false);
  const musicOn = useSyncExternalStore(musicPreference.subscribe, musicPreference.get, () => true);

  useEffect(() => engine.setMuted(muted), [engine, muted]);
  useEffect(() => engine.setMusicEnabled(musicOn), [engine, musicOn]);

  // Run the music and ambience schedulers only while they can be heard.
  useEffect(() => {
    if (muted || !musicOn) return;
    const unsubscribe = engine.onRunning(() => {
      music.start();
      ambience.start();
    });
    return () => {
      unsubscribe();
      music.stop();
      ambience.stop();
    };
  }, [engine, music, ambience, muted, musicOn]);

  useEffect(() => {
    const unlock = () => engine.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      engine.dispose();
    };
  }, [engine]);

  return {
    sounds,
    muted,
    toggleMuted: () => mutedPreference.set(!muted),
    musicOn,
    toggleMusic: () => musicPreference.set(!musicOn),
  };
}

/** A boolean switch remembered per browser. Storage can be blocked, so it falls back to memory. */
function createPreference(key: string, fallback: boolean) {
  const listeners = new Set<() => void>();
  let memory = fallback;

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get(): boolean {
      try {
        const stored = window.localStorage.getItem(key);
        return stored === null ? memory : stored === "1";
      } catch {
        return memory;
      }
    },
    set(value: boolean) {
      memory = value;
      try {
        window.localStorage.setItem(key, value ? "1" : "0");
      } catch {
        // Keep the in-memory value for this session.
      }
      listeners.forEach((listener) => listener());
    },
  };
}

const mutedPreference = createPreference("battle-dice:muted", false);
const musicPreference = createPreference("battle-dice:music", true);
