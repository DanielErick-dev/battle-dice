/** Auric: the Cleansing Tide's wave. */
import { useMemo } from "react";
import { playerColor } from "../../characters";
import { TidalWave } from "../character/TidalWave";
import type { BoardFx } from "./types";

export function Tide({ fx: { view, layout } }: { fx: BoardFx }) {
  const tide = view.fx.tide;
  const path = useMemo(() => tide?.path.map((tile) => layout.position(tile)) ?? [], [tide?.path, layout]);
  return tide && <TidalWave key={`tide${tide.id}`} path={path} color={playerColor(tide.playerId)} />;
}
