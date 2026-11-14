import { useRef } from "react";

/** Seconds since the first rendered frame; one-shot effects mount with a fresh key per cast. */
export function useAge(): (now: number) => number {
  const bornAt = useRef<number | null>(null);
  return (now: number) => {
    bornAt.current ??= now;
    return now - bornAt.current;
  };
}
