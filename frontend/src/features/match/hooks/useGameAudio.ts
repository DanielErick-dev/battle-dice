"use client";

import { useEffect, useState } from "react";
import { preferences, usePreference } from "@/features/settings/preferences";
import { Ambience } from "../audio/ambience";
import { AudioEngine } from "@/features/shared/audio/audioEngine";
import { GenerativeMusic } from "../audio/music";
import { SynthSounds } from "../audio/soundEffects";

export interface GameAudio {
  sounds: SynthSounds;
  muted: boolean;
  toggleMuted: () => void;
  musicOn: boolean;
  toggleMusic: () => void;
  /** The match is on screen (its loading curtain lifted): until then the game stays silent. */
  setLive: (live: boolean) => void;
}

/** One engine for the whole session; browsers keep audio locked until the first pointer or key press. */
export function useGameAudio(): GameAudio {
  const [engine] = useState(() => new AudioEngine());
  const [sounds] = useState(() => new SynthSounds(engine));
  const [music] = useState(() => new GenerativeMusic(engine));
  const [ambience] = useState(() => new Ambience(engine));
  const muted = usePreference(preferences.muted);
  const musicOn = usePreference(preferences.music);
  // Silent behind the loading curtain: music starting over a loading bar sounded like a glitch.
  const [live, setLive] = useState(false);

  useEffect(() => engine.setMuted(muted || !live), [engine, muted, live]);
  useEffect(() => engine.setMusicEnabled(musicOn), [engine, musicOn]);

  // Run the music and ambience schedulers only while they can be heard.
  useEffect(() => {
    if (muted || !musicOn || !live) return;
    const unsubscribe = engine.onRunning(() => {
      music.start();
      ambience.start();
    });
    return () => {
      unsubscribe();
      music.stop();
      ambience.stop();
    };
  }, [engine, music, ambience, muted, musicOn, live]);

  useEffect(() => {
    const unlock = () => engine.unlock();
    // Arriving from a menu click it starts at once; on a fresh load the browser holds it until the first input.
    unlock();
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
      engine.dispose();
    };
  }, [engine]);

  return {
    sounds,
    muted,
    toggleMuted: () => preferences.muted.set(!muted),
    musicOn,
    toggleMusic: () => preferences.music.set(!musicOn),
    setLive,
  };
}
