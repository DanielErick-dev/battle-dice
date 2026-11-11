/** A scattered piece's world scale (the kits come at different sizes) and kit size (width, height, depth). */
interface Piece {
  scale: number;
  size: [number, number, number];
}

export const PIECES = {
  "detail-dumpster-open": { scale: 3, size: [0.6, 0.55, 0.48] },
  "detail-barrier-strong-damaged": { scale: 3, size: [0.66, 0.33, 0.25] },
  "detail-barrier-type-a": { scale: 3, size: [0.43, 0.4, 0.13] },
  "detail-light-single": { scale: 4, size: [0.09, 0.96, 0.26] },
  "truck-grey": { scale: 2.6, size: [0.83, 1.01, 1.64] },
  "truck-green-cargo": { scale: 2.6, size: [0.83, 0.74, 1.17] },
  pallet: { scale: 1.6, size: [1, 0.15, 1] },
  planks: { scale: 1.6, size: [1.13, 0.1, 0.57] },
  sedan: { scale: 1.3, size: [1.5, 1.3, 2.55] },
  suv: { scale: 1.3, size: [1.5, 1.3, 2.7] },
  taxi: { scale: 1.3, size: [1.5, 1.5, 2.75] },
  police: { scale: 1.3, size: [1.5, 1.3, 3.1] },
  van: { scale: 1.3, size: [1.5, 1.35, 2.75] },
  ambulance: { scale: 1.3, size: [1.5, 1.8, 3.25] },
  "debris-tire": { scale: 1.3, size: [0.35, 0.6, 0.6] },
  "debris-door": { scale: 1.3, size: [0.19, 0.9, 0.8] },
  "debris-bumper": { scale: 1.3, size: [1.3, 0.4, 0.45] },
  cone: { scale: 1.3, size: [0.48, 0.6, 0.48] },
  "pine-crooked": { scale: 2.4, size: [1.18, 2.11, 1.33] },
  "pine-fall-crooked": { scale: 2.4, size: [1.18, 2.11, 1.33] },
  "gravestone-broken": { scale: 2.4, size: [0.51, 0.34, 0.39] },
  "iron-fence-damaged": { scale: 2.4, size: [1, 0.88, 0.32] },
  "fire-basket": { scale: 3, size: [0.42, 0.17, 0.42] },
  debris: { scale: 3, size: [0.54, 0.16, 0.55] },
  "debris-wood": { scale: 3, size: [0.46, 0.1, 0.5] },
  rocks: { scale: 2.4, size: [1.08, 0.38, 0.96] },
  barrel: { scale: 3, size: [0.24, 0.34, 0.24] },
  "structure-metal": { scale: 5, size: [0.54, 0.5, 0.54] },
  "metal-panel": { scale: 4, size: [0.5, 0.5, 0.05] },
  "tent-canvas": { scale: 4.5, size: [0.56, 0.49, 0.56] },
  "fence-fortified": { scale: 4, size: [0.5, 0.52, 0.05] },
  signpost: { scale: 3.5, size: [0.21, 0.46, 0.04] },
  "tree-trunk": { scale: 4, size: [0.2, 0.26, 0.2] },
} satisfies Record<string, Piece>;
export type PieceId = keyof typeof PIECES;

/** The cars and trucks left by the road, drawn rusted apart from the rest. */
export const WRECKS: readonly PieceId[] = [
  "sedan",
  "suv",
  "taxi",
  "police",
  "van",
  "ambulance",
  "truck-grey",
  "truck-green-cargo",
];

/** Odds and ends of the end of the world, and how often each turns up. */
export const SCATTER: readonly [[PieceId, number], ...[PieceId, number][]] = [
  ["debris", 4],
  ["debris-wood", 3],
  ["rocks", 3],
  ["debris-tire", 3],
  ["debris-door", 2],
  ["debris-bumper", 2],
  ["cone", 2],
  ["barrel", 3],
  ["pine-crooked", 3],
  ["pine-fall-crooked", 2],
  ["gravestone-broken", 2],
  ["iron-fence-damaged", 2],
  ["detail-barrier-strong-damaged", 2],
  ["detail-barrier-type-a", 2],
  ["detail-dumpster-open", 2],
  ["detail-light-single", 2],
  ["fire-basket", 2],
  ["structure-metal", 2],
  ["tent-canvas", 2],
  ["fence-fortified", 2],
  ["metal-panel", 2],
  ["pallet", 2],
  ["planks", 2],
  ["tree-trunk", 2],
  ["signpost", 1],
];
