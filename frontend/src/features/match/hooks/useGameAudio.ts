"use client";

import { useEffect, useState } from "react";
import { preferences, usePreference } from "@/features/settings/preferences";
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
 * mute and music switches (see preferences). The first pointer or key press
 * unlocks audio, which starts the music.
 */
export function useGameAudio(): GameAudio {
  const [engine] = useState(() => new AudioEngine());
  const [sounds] = useState(() => new SynthSounds(engine));
  const [music] = useState(() => new GenerativeMusic(engine));
  const [ambience] = useState(() => new Ambience(engine));
  const muted = usePreference(preferences.muted);
  const musicOn = usePreference(preferences.music);

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
    toggleMuted: () => preferences.muted.set(!muted),
    musicOn,
    toggleMusic: () => preferences.music.set(!musicOn),
  };
}
