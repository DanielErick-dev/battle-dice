/** Wandering Sage: Dormant Fury's charge, its lightning dash and the landing out of it. */
import { useMemo } from "react";
import type { Object3D } from "three";
import { playerColor } from "../../characters";
import { AbilityBurst } from "../AbilityBurst";
import { ElectricField } from "../character/monk/ElectricField";
import { EFFECT_SCALE, FIGURE_HEIGHT } from "../character/core/figure";
import { LightningDash } from "../character/monk/LightningDash";
import { LimbLightning } from "../character/monk/LimbLightning";
import { Delayed, SwordImpact } from "../TrapSmash";
import type { BoardFx, TokenFx } from "./types";

/** Crackles round the figure while the fury waits for the roll. */
export function FuryField({ token }: { token: TokenFx }) {
  return <ElectricField active={token.isFuryAwake} color={token.color} size={FIGURE_HEIGHT} />;
}

/** The shockwave as the feet touch the ground out of a dash. */
export function DashLanding({ token }: { token: TokenFx }) {
  return (
    token.landing !== null && (
      <group scale={EFFECT_SCALE}>
        <Delayed key={token.landing} seconds={token.character?.landImpactSeconds ?? 0}>
          <AbilityBurst color={token.color} />
          <SwordImpact color={token.color} />
        </Delayed>
      </group>
    )
  );
}

export function LimbBolts({ token, figure }: { token: TokenFx; figure: Object3D }) {
  return (
    token.character?.limbLightning && (
      <LimbLightning
        figure={figure}
        size={FIGURE_HEIGHT}
        color={token.color}
        active={token.live.crackling}
        charged={token.live.charged}
      />
    )
  );
}

export function DashBolt({ fx: { view, layout } }: { fx: BoardFx }) {
  const dash = view.fx.dash;
  const path = useMemo(() => dash?.path.map((tile) => layout.position(tile)) ?? [], [dash?.path, layout]);
  return dash && <LightningDash key={`dash${dash.id}`} path={path} color={playerColor(dash.playerId)} />;
}
