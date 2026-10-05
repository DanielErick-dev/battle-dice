"use client";

import { useSyncExternalStore } from "react";
import { BOARD_PRESETS, DEFAULT_BOARD_ID } from "../match/boards";
import { DEFAULT_CHARACTER_ID } from "../match/characters";
import type { EffectsQuality } from "../match/config";

/**
 * A setting remembered per browser. Storage can be blocked (private mode, site data off),
 * so it falls back to an in-memory value for the session. Once accounts exist, the ones
 * that belong to the player (character, board) can move to their profile on the server.
 */
export interface Preference<T> {
  subscribe: (listener: () => void) => () => void;
  get: () => T;
  set: (value: T) => void;
  fallback: T;
}

function createPreference<T>(
  key: string,
  fallback: T,
  parse: (stored: string) => T | undefined,
  serialize: (value: T) => string,
): Preference<T> {
  const listeners = new Set<() => void>();
  let memory = fallback;

  return {
    fallback,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get() {
      try {
        const stored = window.localStorage.getItem(key);
        return stored === null ? memory : (parse(stored) ?? memory);
      } catch {
        return memory;
      }
    },
    set(value) {
      memory = value;
      try {
        window.localStorage.setItem(key, serialize(value));
      } catch {
        // Keep the in-memory value for this session.
      }
      listeners.forEach((listener) => listener());
    },
  };
}

const booleanPreference = (key: string, fallback: boolean) =>
  createPreference(
    key,
    fallback,
    (stored) => stored === "1",
    (value) => (value ? "1" : "0"),
  );

/** A preference restricted to a fixed set of values; anything else stored is ignored. */
function choicePreference<T extends string>(key: string, fallback: T, choices: readonly T[]): Preference<T> {
  return createPreference(
    key,
    fallback,
    (stored) => choices.find((choice) => choice === stored),
    (value) => value,
  );
}

export const preferences = {
  muted: booleanPreference("battle-dice:muted", false),
  music: booleanPreference("battle-dice:music", true),
  effectsQuality: choicePreference<EffectsQuality>("battle-dice:effects-quality", "high", ["high", "low"]),
  /** The local match's characters in turn order, comma-separated (read with parseCharacterList). */
  players: createPreference(
    "battle-dice:players",
    DEFAULT_CHARACTER_ID,
    (stored) => stored,
    (value) => value,
  ),
  /** Test mode: every ability starts the match charged, to try them out quickly. */
  chargedAbilities: booleanPreference("battle-dice:charged-abilities", false),
  board: choicePreference(
    "battle-dice:board",
    DEFAULT_BOARD_ID,
    BOARD_PRESETS.map((preset) => preset.id),
  ),
};

/** Reads a preference and re-renders when it changes; the server render uses the fallback. */
export function usePreference<T>(preference: Preference<T>): T {
  return useSyncExternalStore(preference.subscribe, preference.get, () => preference.fallback);
}
