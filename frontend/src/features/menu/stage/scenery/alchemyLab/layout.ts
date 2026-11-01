export const BENCH = { x: -0.52, z: -0.66, turn: 0.55, width: 0.64, depth: 0.24, height: 0.46 };

export const BENCH_TOP = BENCH.height + 0.0175;

export type FlaskKind = "round" | "cone" | "tall";

/** Along the bench top; `size` is the bulb's radius (a vial's own radius for "tall"). */
export const FLASKS: { x: number; z: number; kind: FlaskKind; size: number; liquid: string }[] = [
  { x: -0.22, z: 0.02, kind: "round", size: 0.07, liquid: "#1ee89a" },
  { x: -0.07, z: -0.04, kind: "cone", size: 0.06, liquid: "#8af25a" },
  { x: 0.06, z: 0.04, kind: "tall", size: 0.02, liquid: "#10b981" },
  { x: 0.12, z: -0.05, kind: "tall", size: 0.016, liquid: "#5eead4" },
  { x: 0.22, z: 0.01, kind: "round", size: 0.048, liquid: "#34f5b0" },
];

export function flaskHeight({ kind, size }: { kind: FlaskKind; size: number }): number {
  return kind === "round" ? size * 3.2 : kind === "cone" ? size * 2.2 : size * 6;
}
