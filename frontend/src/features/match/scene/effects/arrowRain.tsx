/** Elven Archer: the volley and the traps its arrows pin down. */
import { useMemo } from "react";
import { playerColor } from "../../characters";
import { ArrowVolley, PinnedTrapMark } from "../character/ArrowRain";
import type { BoardFx } from "./types";

/** The leaf green of the archer who shot them. */
const PINNED_TRAP_COLOR = "#84cc16";

export function PinnedTraps({ fx: { view, layout, shown } }: { fx: BoardFx }) {
  return view.pinnedTraps
    .filter(shown)
    .map((tile) => <PinnedTrapMark key={`pinned${tile}`} position={layout.position(tile)} color={PINNED_TRAP_COLOR} />);
}

export function Volley({ fx: { view, layout } }: { fx: BoardFx }) {
  const volley = view.fx.volley;
  const targets = useMemo(() => volley?.targets.map((tile) => layout.position(tile)) ?? [], [volley?.targets, layout]);
  return (
    volley && (
      <ArrowVolley
        key={`volley${volley.id}`}
        from={layout.position(volley.from)}
        targets={targets}
        color={playerColor(volley.playerId)}
      />
    )
  );
}
