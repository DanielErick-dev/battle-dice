import { Sparkles } from "lucide-react";
import { abilityBlocker, abilityCycle, isAbilityReady, isReactive } from "@/game/domain/abilities";
import type { Player } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { ABILITY_TEXT } from "../abilityText";

interface AbilityMeterProps {
  player: Player;
  /** Used this turn and still in effect. */
  inUse?: boolean;
  /** Shows a "Usar" button while the ability is ready (not for reactive ones, which are offered). */
  onActivate?: () => void;
  /** The button can be pressed now (it's the player's moment to act). */
  canActivate?: boolean;
}

/** Why a charged ability can't be used right now, from the player's own state. */
const WAIT_REASONS: Partial<Record<string, string>> = {
  ENERGY_FULL: "Sua energia já está no máximo",
  ALREADY_SHIELDED: "O Escudo Arcano já está ativo",
};

/**
 * The character's ability: its name and charge, one pip per turn. Charged, it glows and
 * waits; the player uses it with the button, or is asked when it's a reactive one.
 */
export function AbilityMeter({ player, inUse = false, onActivate, canActivate = false }: AbilityMeterProps) {
  if (!player.ability) return null;
  const text = ABILITY_TEXT[player.ability];
  const ready = isAbilityReady(player);
  const reactive = isReactive(player.ability);
  const blocker = abilityBlocker(player, null);
  const waitReason = blocker ? WAIT_REASONS[blocker] : undefined;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1",
        (ready || inUse) && "bg-violet-500/20 ring-1 ring-violet-300/50",
      )}
      title={`${text.name}: ${text.description}`}
    >
      <Sparkles className={cn("size-3.5 shrink-0", ready || inUse ? "text-violet-200" : "text-zinc-500")} />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[10px] font-bold tracking-wider uppercase",
          ready || inUse ? "text-violet-100" : "text-zinc-400",
        )}
      >
        {text.name}
      </span>
      {inUse ? (
        <span className="text-[9px] font-black tracking-widest text-violet-200 uppercase">Em uso</span>
      ) : ready && onActivate && !reactive ? (
        <button
          type="button"
          onClick={onActivate}
          disabled={!canActivate}
          title={waitReason ?? (canActivate ? `Usar ${text.name}` : "Aguarde sua vez")}
          className="rounded-md bg-violet-500 px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase shadow-[0_0_12px_rgba(167,139,250,0.7)] transition hover:bg-violet-400 active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          Usar
        </button>
      ) : ready ? (
        <span className="text-[9px] font-black tracking-widest text-violet-200 uppercase">Pronta</span>
      ) : (
        <span className="flex gap-0.5" aria-label={`Carga ${player.abilityCharge} de ${abilityCycle(player.ability)}`}>
          {Array.from({ length: abilityCycle(player.ability) }, (_, i) => (
            <span
              key={i}
              className={cn("size-1.5 rounded-full", i < player.abilityCharge ? "bg-violet-300" : "bg-white/15")}
            />
          ))}
        </span>
      )}
    </div>
  );
}
