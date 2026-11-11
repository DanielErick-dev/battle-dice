import { itemAt } from "@/features/shared/collections/items";
/** Energy colour along the path: green at the start, through blue and violet, to gold at the finish. */
const PATH_STOPS: readonly [number, [number, number, number]][] = [
  [0, [16, 185, 129]],
  [0.35, [56, 189, 248]],
  [0.7, [168, 85, 247]],
  [1, [251, 191, 36]],
];

export function pathColor(progress: number): string {
  const t = Math.min(1, Math.max(0, progress));
  const upper = PATH_STOPS.findIndex(([stop]) => stop >= t);
  const [endAt, end] = itemAt(PATH_STOPS, Math.max(upper, 1));
  const [startAt, start] = itemAt(PATH_STOPS, Math.max(upper, 1) - 1);
  const k = (t - startAt) / (endAt - startAt || 1);
  const channel = (from: number, to: number) => Math.round(from + (to - from) * k);
  return `rgb(${channel(start[0], end[0])}, ${channel(start[1], end[1])}, ${channel(start[2], end[2])})`;
}
