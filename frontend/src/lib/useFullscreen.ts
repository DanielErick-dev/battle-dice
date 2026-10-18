"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void): () => void {
  document.addEventListener("fullscreenchange", listener);
  return () => document.removeEventListener("fullscreenchange", listener);
}

/** Fullscreen state and toggle; browsers only allow the switch from a click or key press. */
export function useFullscreen(): { fullscreen: boolean; toggle: () => void } {
  const fullscreen = useSyncExternalStore(
    subscribe,
    () => document.fullscreenElement !== null,
    () => false,
  );
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  };
  return { fullscreen, toggle };
}
