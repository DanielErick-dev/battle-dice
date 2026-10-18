/** Void Knight: his blades of light and the traps his Trap Ward smashed. */
import type { Object3D } from "three";
import { EnergyBlades } from "../character/EnergyBlades";
import { SmashedTrapMark } from "../TrapSmash";
import type { BoardFx, TokenFx } from "./types";

/** The void violet of the Trap Ward's wielder. */
const SMASHED_TRAP_COLOR = "#8b5cf6";

/** In his hands while the cast clip plays: his modelled swords can't move. */
export function LightBlades({ token, figure }: { token: TokenFx; figure: Object3D }) {
  return (
    token.character?.energyBlades && <EnergyBlades figure={figure} color={token.color} active={token.live.bladesOut} />
  );
}

export function SmashedTraps({ fx: { view, layout, shown } }: { fx: BoardFx }) {
  return view.destroyedTraps
    .filter(shown)
    .map((tile) => (
      <SmashedTrapMark key={`smashed${tile}`} tile={tile} position={layout.position(tile)} color={SMASHED_TRAP_COLOR} />
    ));
}
