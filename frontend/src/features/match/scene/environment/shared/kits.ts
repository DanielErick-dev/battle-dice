/** The free kits' pieces, one GLB each (see scripts/props/build-kits.mjs). */
export const KIT_URLS = {
  kaykit: "/models/island/kaykit.glb",
  kenney: "/models/island/kenney.glb",
  dungeon: "/models/island/dungeon.glb",
  wasteland: "/models/island/wasteland.glb",
} as const;
export type Kit = keyof typeof KIT_URLS;

/** A piece of a kit (a node of its GLB) set down: `scale` is its whole scale in world units. */
export interface KitItem {
  piece: string;
  x: number;
  y: number;
  z: number;
  turn: number;
  scale: number;
}
