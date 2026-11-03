/** The burst any ability goes off with, unless the character acts it out in a way of their own. */
import { AbilityBurst } from "../AbilityBurst";
import { Delayed, SwordImpact } from "../TrapSmash";
import type { TokenFx } from "./types";

/** The Fallen Angel's fire. */
const HELLFIRE = "#ff2a10";

export function AbilityFlash({ token }: { token: TokenFx }) {
  const { abilityCast, character } = token;
  // Levitation, the vial, the wand, the bow's volley, a still cast and an aura of their own each are the show instead.
  if (
    abilityCast === null ||
    token.player.levitating > 0 ||
    character?.handProp ||
    character?.castsStill ||
    character?.castAura ||
    character?.wand ||
    character?.bow
  )
    return null;
  const color = token.charred ? HELLFIRE : token.color;
  const impact = character?.castImpactSeconds ?? null;
  return impact === null ? (
    <AbilityBurst key={abilityCast} color={color} />
  ) : (
    <Delayed key={abilityCast} seconds={impact}>
      <AbilityBurst color={color} />
      <SwordImpact color={color} />
    </Delayed>
  );
}
