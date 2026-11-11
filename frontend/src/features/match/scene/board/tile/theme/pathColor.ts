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
  const [endAt, end] = PATH_STOPS[Math.max(upper, 1)];
  const [startAt, start] = PATH_STOPS[Math.max(upper, 1) - 1];
  const k = (t - startAt) / (endAt - startAt || 1);
  const channel = (i: number) => Math.round(start[i] + (end[i] - start[i]) * k);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}
