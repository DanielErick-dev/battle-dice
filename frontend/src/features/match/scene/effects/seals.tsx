/** Flesh Scribe: the forbidden seals on the board. */
import { playerColor } from "../../characters";
import { SEAL_TEXT } from "../../ui/placementText";
import { SealScroll } from "../character/SealScroll";
import type { BoardFx } from "./types";

/** A closed scroll for everyone; only its owner sees which seal it is. */
export function Seals({ fx: { view, layout, viewerId, shown } }: { fx: BoardFx }) {
  return view.seals
    .filter((seal) => shown(seal.tile))
    .map((seal) => (
      <SealScroll
        key={`${seal.owner}:${seal.tile}`}
        position={layout.position(seal.tile)}
        color={playerColor(seal.owner)}
        label={seal.owner === viewerId ? SEAL_TEXT[seal.kind].name : undefined}
      />
    ));
}
