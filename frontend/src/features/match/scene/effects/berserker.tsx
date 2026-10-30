/** Bjorn: Untamed's frost aura and the trample's blows. */
import { useState } from "react";
import { AbilityBurst } from "../AbilityBurst";
import { FrostAura } from "../FrostAura";
import { Delayed, SwordImpact } from "../TrapSmash";
import { KNOCKED_LANDING_SECONDS, LUNGE_SECONDS } from "../token/trample";
import type { TokenFx } from "./types";

/** When the blow lands without shoveImpactSeconds to time it. */
const DEFAULT_SHOVE_IMPACT_SECONDS = 0.35;

/** Comes on with the cast and stays while Untamed lasts; kept mounted once on so it melts away. */
export function UntamedAura({ token }: { token: TokenFx }) {
  const frostOn = token.player.untamed > 0 || (token.character?.castAura === "frost" && token.abilityCast !== null);
  const [frosted, setFrosted] = useState(frostOn);
  if (frostOn && !frosted) setFrosted(true);
  return frosted && <FrostAura active={frostOn} delay={token.character?.castImpactSeconds ?? 0} />;
}

export function ShoveImpact({ token }: { token: TokenFx }) {
  const impact = token.character?.shoveImpactSeconds ?? DEFAULT_SHOVE_IMPACT_SECONDS;
  return (
    token.shove !== null &&
    token.shoveAt !== null && (
      <Delayed key={`shove${token.shoveAt}`} seconds={token.hasShoveClip ? impact : LUNGE_SECONDS / 2}>
        <SwordImpact color={token.color} />
      </Delayed>
    )
  );
}

/** Anyone sent flying, by a trample or a Susanoo. */
export function KnockedBurst({ token }: { token: TokenFx }) {
  return (
    token.knocked !== null && (
      <Delayed key={`knocked${token.knocked}`} seconds={KNOCKED_LANDING_SECONDS}>
        <AbilityBurst color={token.color} />
      </Delayed>
    )
  );
}
