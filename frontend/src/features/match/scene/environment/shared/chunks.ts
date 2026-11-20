/** Side of a square of the map whose copies of a prop share one instanced mesh: off screen, three skips it whole. */
export const CHUNK_SIZE = 16;

/** Copies grouped by the square of the map they stand in, so each group can be culled on its own. */
export function chunked<T extends { x: number; z: number }>(items: readonly T[], size = CHUNK_SIZE): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = `${Math.floor(item.x / size)},${Math.floor(item.z / size)}`;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.values()];
}
