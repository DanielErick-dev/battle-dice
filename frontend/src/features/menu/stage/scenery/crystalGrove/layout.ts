import { Color } from "three";

/** `height` is the tallest shard's; `violet` clusters take the fairy-light lilac instead of cyan. */
export const CLUSTERS = [
  { x: -0.62, z: -0.6, height: 0.82, shards: 6, violet: false },
  { x: 0.12, z: -0.9, height: 0.5, shards: 5, violet: true },
  { x: 0.6, z: -0.62, height: 0.66, shards: 6, violet: false },
  { x: -0.84, z: -0.05, height: 0.28, shards: 3, violet: true },
  { x: 0.82, z: -0.1, height: 0.22, shards: 3, violet: false },
];

export const CYAN = new Color("#22d3ee");

export const LILAC = new Color("#a78bfa");
