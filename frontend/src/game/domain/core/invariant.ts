/** `items[index]` where the rules guarantee it exists: a miss is a bug, so it fails here, not later on undefined. */
export function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new RangeError(`No item at index ${index} of ${items.length}`);
  return item;
}
