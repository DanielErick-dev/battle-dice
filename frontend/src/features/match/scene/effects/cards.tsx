/** Card effects on the figures and the board: auras, orbs, the shield and the one-shot casts. */
import { AWAKENING_BONUS } from "@/game/domain/cards";
import type { DiceBonus, DiceBoost } from "@/game/domain/types";
import { ArcaneBeam, BoostOrb, HealBurst, ShieldBubble, WindCloud, type OrbPalette } from "../CardEffects";
import { EnergyAura } from "../EnergyAura";
import { tokenPosition } from "../tokenPlacement";
import type { BoardFx, TokenFx } from "./types";

export function PoweredAura({ token }: { token: TokenFx }) {
  return <EnergyAura active={token.isPowered || isAwakened(token.player.diceBonuses)} />;
}

/** Berserk Fury's double die; the Fallen Angel's ability flares it too. */
export function RedAura({ token }: { token: TokenFx }) {
  return (
    <EnergyAura
      active={token.player.diceBoost?.kind === "double" || (token.charred && token.abilityCast !== null)}
      palette="red"
    />
  );
}

export function DiceOrb({ token }: { token: TokenFx }) {
  const palette = orbFor(token.player.diceBoost, token.player.diceBonuses);
  return palette && <BoostOrb palette={palette} />;
}

export function ShieldFx({ token }: { token: TokenFx }) {
  const { shielded, spectralArmour } = token.player;
  // Inside her Susanoo the shield waits; it shows again once the Susanoo is gone.
  const underSusanoo = token.character?.armourLook === "susanoo" && spectralArmour > 0;
  return (
    shielded &&
    !underSusanoo && (
      <ShieldBubble color={token.character?.shieldColor} winged={hasGreatWings(token)} seated={token.live.seated} />
    )
  );
}

export function WindStepFx({ token }: { token: TokenFx }) {
  return token.cast?.card.cardId === "windStep" && <WindCloud key={`wind${token.cast.id}`} />;
}

export function HealingHerbFx({ token }: { token: TokenFx }) {
  return token.cast?.card.cardId === "healingHerb" && <HealBurst key={`heal${token.cast.id}`} />;
}

export function ArcaneBlastFx({ fx: { view, layout } }: { fx: BoardFx }) {
  const cast = view.fx.cast;
  return (
    cast?.card.cardId === "arcaneBlast" &&
    cast.targetId && (
      <ArcaneBeam
        key={`beam${cast.id}`}
        from={tokenPosition(view, layout, cast.playerId)}
        to={tokenPosition(view, layout, cast.targetId)}
      />
    )
  );
}

/** Ancestral Awakening shows as the golden aura for as long as its bonus lasts. */
function isAwakened(bonuses: readonly DiceBonus[]): boolean {
  return bonuses.some(({ amount }) => amount === AWAKENING_BONUS);
}

/** The orb of the throw waiting for the roll, or Lucky Charm's. */
function orbFor(boost: DiceBoost | null, bonuses: readonly DiceBonus[]): OrbPalette | null {
  if (boost?.kind === "fixed") return "fate";
  if (boost?.kind === "best") return "oracle";
  if (bonuses.some(({ amount }) => amount !== AWAKENING_BONUS)) return "luck";
  return null;
}

/** Seraphiel's great wings stand out of the usual bubble; the fairy's small ones fit inside it. */
export function hasGreatWings(token: TokenFx): boolean {
  const wings = token.character?.wings;
  return wings === "seraph" || wings === "fallen";
}
