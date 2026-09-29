import { MAX_ENERGY, TURNS_PER_ENERGY } from "@/game/domain/cards";
import { cn } from "@/lib/utils";

const ENERGY_HELP = `Energia é o que você gasta para usar cartas. Você ganha 1 a cada ${TURNS_PER_ENERGY} turnos (máximo ${MAX_ENERGY}).`;

/** Energy as a labelled row of orbs, filled up to the current amount, with the count. */
export function EnergyMeter({ energy, className }: { energy: number; className?: string }) {
  return (
    <span
      className={cn("flex items-center gap-1.5", className)}
      title={ENERGY_HELP}
      aria-label={`Energia: ${energy} de ${MAX_ENERGY}`}
    >
      <span className="text-[10px] font-black tracking-wider text-amber-300">ENERGIA</span>
      <span className="flex items-center gap-1">
        {Array.from({ length: MAX_ENERGY }, (_, i) => (
          <span
            key={i}
            className={cn("size-2.5 rounded-full transition-all", i < energy ? "energy-orb" : "bg-white/10 ring-1 ring-white/15")}
          />
        ))}
      </span>
      <span className="font-mono text-[10px] text-zinc-400">
        {energy}/{MAX_ENERGY}
      </span>
    </span>
  );
}
