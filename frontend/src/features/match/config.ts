import type { PlayerId } from "@/game/domain/types";

/** Horizontal strip of equally sized frames, feet aligned to the bottom edge, facing right. */
export interface SpriteSheet {
  src: string;
  frames: number;
  frameWidth: number;
  frameHeight: number;
  fps: number;
  /** On-screen height in CSS pixels at the reference camera distance. */
  displayHeight: number;
}

export interface PlayerSkin {
  color: string;
  sprites?: { idle: SpriteSheet; run: SpriteSheet };
}

export interface RosterEntry {
  id: PlayerId;
  name: string;
  skin: PlayerSkin;
}

/** Local hot-seat roster. Add entries here to play with more people on the same screen. */
export const MATCH_ROSTER: readonly RosterEntry[] = [
  {
    id: "goku",
    name: "Goku",
    skin: {
      color: "#f97316",
      sprites: {
        idle: {
          src: "/sprites/goku-idle.png",
          frames: 12,
          frameWidth: 202,
          frameHeight: 204,
          fps: 8,
          displayHeight: 146,
        },
        run: {
          src: "/sprites/goku-run.png",
          frames: 10,
          frameWidth: 214,
          frameHeight: 179,
          fps: 11,
          displayHeight: 132,
        },
      },
    },
  },
];

const FALLBACK_SKIN: PlayerSkin = { color: "#38bdf8" };

export function skinFor(playerId: PlayerId): PlayerSkin {
  return MATCH_ROSTER.find((entry) => entry.id === playerId)?.skin ?? FALLBACK_SKIN;
}

export interface PlaybackTimings {
  diceRollMs: number;
  diceRevealMs: number;
  stepMs: number;
  effectWarmupMs: number;
  effectTravelMs: number;
}

export const DEFAULT_TIMINGS: PlaybackTimings = {
  diceRollMs: 700,
  diceRevealMs: 250,
  stepMs: 520,
  effectWarmupMs: 450,
  effectTravelMs: 750,
};
