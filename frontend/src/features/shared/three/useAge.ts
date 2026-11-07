import { useRef } from "react";

/**
 * Seconds since this component first rendered a frame; one-shot effects mount with a
 * fresh key per cast and fade themselves out.
 */
export function useAge(): (now: number) => number {
  const bornAt = useRef<number | null>(null);
  return (now: number) => {
    bornAt.current ??= now;
    return now - bornAt.current;
  };
}
