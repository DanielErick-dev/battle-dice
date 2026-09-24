"use client";

import { useEffect } from "react";
import { connectMatchAudio } from "../audio/matchAudio";
import type { MatchSounds } from "../audio/soundEffects";
import type { MatchStore } from "../model/matchStore";

/** Plays the match's sound effects as its view changes. */
export function useMatchAudio(store: MatchStore, sounds: MatchSounds): void {
  useEffect(() => connectMatchAudio(store, sounds), [store, sounds]);
}
