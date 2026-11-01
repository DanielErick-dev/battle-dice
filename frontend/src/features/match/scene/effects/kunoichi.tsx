/** Kage Rubra: her Susanoo armour and the black fire on the board. */
import { playerColor } from "../../characters";
import { ShieldBubble } from "../CardEffects";
import { hasGreatWings } from "./cards";
import { Susanoo } from "../character/kage/Susanoo";
import { BlackFlameMark } from "../character/kage/BlackFlameMark";
import type { BoardFx, TokenFx } from "./types";

/** Spectral Armour as a plain shell, for anyone without a look of their own. */
export function ArmourShell({ token }: { token: TokenFx }) {
  const { spectralArmour, shielded } = token.player;
  return (
    spectralArmour > 0 &&
    !shielded &&
    !token.character?.armourLook && (
      <ShieldBubble color={token.color} winged={hasGreatWings(token)} seated={token.live.seated} />
    )
  );
}

/** In the figure's frame, so it faces the way she does. */
export function SusanooArmour({ token }: { token: TokenFx }) {
  return token.character?.armourLook === "susanoo" && <Susanoo active={token.player.spectralArmour > 0} />;
}

export function BlackFlames({ fx: { view, layout, shown } }: { fx: BoardFx }) {
  return view.blackFlames
    .filter(({ tile }) => shown(tile))
    .map(({ tile, owner }) => (
      <BlackFlameMark
        key={`flame${tile}`}
        position={layout.position(tile)}
        outline={layout.slab(tile)?.outline}
        color={playerColor(owner)}
      />
    ));
}
