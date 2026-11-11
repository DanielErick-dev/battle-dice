/** `items[index]` where the caller guarantees it exists: a miss is a bug, so it fails here, not later on undefined. */
export function itemAt<T>(items: ArrayLike<T>, index: number): T {
  const item = items[index];
  if (item === undefined) throw new RangeError(`No item at index ${index} of ${items.length}`);
  return item;
}

/** `items[index]` wrapping around both ends, for palettes and patterns that repeat. */
export function cycle<T>(items: ArrayLike<T>, index: number): T {
  const length = items.length;
  return itemAt(items, ((index % length) + length) % length);
}

/** One of `items` for a draw in [0, 1). */
export function pick<T>(items: ArrayLike<T>, draw: number): T {
  return itemAt(items, Math.min(items.length - 1, Math.floor(draw * items.length)));
}
