/**
 * Pip layout per die value, as cells of a 3×3 grid read left to right, top to bottom
 * (0 = top-left, 4 = centre, 8 = bottom-right). Shared by the HUD die and the 3D die.
 */
export const PIPS: Readonly<Record<number, readonly number[]>> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
