/** Crimson Witch: Levitation's aura, burst and staff. */
import type { Object3D } from "three";
import { FIGURE_HEIGHT, LEVITATE_HEIGHT } from "@/features/characters/core/figure";
import { LevitationAura } from "@/features/characters/witch/LevitationAura";
import { LevitationBurst } from "@/features/characters/witch/LevitationBurst";
import { WitchStaff } from "@/features/characters/witch/WitchStaff";
import type { TokenFx } from "./types";

export function LevitationGlow({ token }: { token: TokenFx }) {
  return (
    <LevitationAura size={FIGURE_HEIGHT} color={token.color} progress={token.live.rise} height={LEVITATE_HEIGHT} />
  );
}

export function LevitationCast({ token }: { token: TokenFx }) {
  return (
    token.abilityCast !== null &&
    token.player.levitating > 0 && <LevitationBurst key={token.abilityCast} size={FIGURE_HEIGHT} color={token.color} />
  );
}

/** Mounted on every figure: it only shows while levitating. */
export function LevitationStaff({ token, figure }: { token: TokenFx; figure: Object3D }) {
  return <WitchStaff figure={figure} color={token.color} active={token.live.levitating} />;
}
