import { useEffect, useState } from "react";
import { MAX_ENERGY, TURNS_PER_ENERGY } from "@/game/domain/core/energy";
import { cn } from "@/lib/utils";

const ENERGY_HELP = `Energia é o que você gasta para usar cartas. Você ganha 1 a cada ${TURNS_PER_ENERGY} turnos (máximo ${MAX_ENERGY}).`;

/** Milliseconds between one orb filling and the next as energy comes in. */
const FILL_STEP_MS = 380;

/**
 * Energy as shown: climbing to `energy` one orb at a time when it goes up (each orb pops as it
 * fills, see .energy-orb-fill), dropping at once when it's spent.
 */
export function useShownEnergy(energy: number): number {
  const [shown, setShown] = useState(energy);
  if (energy < shown) setShown(energy);
  useEffect(() => {
    if (shown >= energy) return;
    const timer = setTimeout(() => setShown((count) => Math.min(energy, count + 1)), FILL_STEP_MS);
    return () => clearTimeout(timer);
  }, [shown, energy]);
  return Math.min(shown, energy);
}

/** Energy as a labelled row of orbs, filled up to the current amount, with the count. */
export function EnergyMeter({
  energy,
  className,
  bright = false,
}: {
  energy: number;
  className?: string;
  /** Bigger orbs with lit empties: phones are read at arm's length, often in a dim room. */
  bright?: boolean;
}) {
  const shown = useShownEnergy(energy);
  return (
    <span
      className={cn("flex items-center gap-1.5", className)}
      title={ENERGY_HELP}
      aria-label={`Energia: ${energy} de ${MAX_ENERGY}`}
    >
      <span className={cn("font-black tracking-wider text-amber-300", bright ? "text-xs" : "text-[10px]")}>
        ENERGIA
      </span>
      <EnergyOrbs
        shown={shown}
        className="gap-1"
        orbClassName={bright ? "size-3.5 ring-1 ring-white/30" : "size-2.5 ring-1 ring-white/15"}
        emptyClassName={bright ? "bg-white/30 ring-1 ring-white/50" : undefined}
      />
      <span className={cn("font-mono font-bold text-amber-100", bright ? "text-sm" : "text-[10px]")}>
        {shown}/{MAX_ENERGY}
      </span>
    </span>
  );
}

/** The row of MAX_ENERGY orbs, the first `shown` of them lit. */
export function EnergyOrbs({
  shown,
  className,
  orbClassName,
  emptyClassName = "bg-amber-100/15 ring-1 ring-amber-200/25",
}: {
  shown: number;
  className?: string;
  orbClassName?: string;
  emptyClassName?: string;
}) {
  return (
    <span className={cn("flex items-center", className)}>
      {Array.from({ length: MAX_ENERGY }, (_, i) => (
        <span
          key={i}
          className={cn(
            "rounded-full transition-all",
            orbClassName,
            i < shown ? "energy-orb energy-orb-fill" : emptyClassName,
          )}
        />
      ))}
    </span>
  );
}
