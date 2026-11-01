/** Emerald Alchemist: the vial held through the cast, then thrown. */
import type { Object3D } from "three";
import { HeldVial } from "../character/alchemist/HeldVial";
import { VialShatter } from "../character/alchemist/VialShatter";
import { FIGURE_HEIGHT } from "../character/core/figure";
import { Delayed } from "../TrapSmash";
import type { TokenFx } from "./types";

export function HandVial({ token, figure }: { token: TokenFx; figure: Object3D }) {
  return (
    token.character?.handProp === "vial" && (
      <HeldVial figure={figure} color={token.color} active={token.live.propHeld} />
    )
  );
}

/** In the figure's frame, so the vial is thrown the way it faces. */
export function VialThrow({ token }: { token: TokenFx }) {
  return (
    token.abilityCast !== null &&
    token.character?.handProp === "vial" && (
      <Delayed key={token.abilityCast} seconds={token.character.castImpactSeconds ?? 0}>
        <VialShatter size={FIGURE_HEIGHT} color={token.color} />
      </Delayed>
    )
  );
}
