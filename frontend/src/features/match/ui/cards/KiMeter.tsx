import { MAX_KI } from "@/game/domain/cards";
import { cn } from "@/lib/utils";

const KI_HELP = `Ki é a energia para usar cartas. Você ganha 1 no começo de cada turno (máximo ${MAX_KI}).`;

/** Ki as a labelled row of orbs, filled up to the current amount, with the count. */
export function KiMeter({ ki, className }: { ki: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5", className)} title={KI_HELP} aria-label={`Ki: ${ki} de ${MAX_KI}`}>
      <span className="text-[10px] font-black tracking-wider text-amber-300">KI</span>
      <span className="flex items-center gap-1">
        {Array.from({ length: MAX_KI }, (_, i) => (
          <span
            key={i}
            className={cn("size-2.5 rounded-full transition-all", i < ki ? "ki-orb" : "bg-white/10 ring-1 ring-white/15")}
          />
        ))}
      </span>
      <span className="font-mono text-[10px] text-zinc-400">
        {ki}/{MAX_KI}
      </span>
    </span>
  );
}
