import { Droplet, Feather, Sparkle, Sun, type LucideIcon } from "lucide-react";
import type { Player, TimedBlessing } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { BLESSING_TEXT } from "../blessingText";

const ICONS: Readonly<Record<TimedBlessing, LucideIcon>> = {
  wings: Feather,
  halo: Sun,
  inspiration: Sparkle,
  spring: Droplet,
};

/**
 * Heaven's blessings on a player, one gold chip each with the rounds it has left; nothing when
 * there are none. `compact` drops the names (the players list).
 */
export function BlessingBadges({ player, compact = false }: { player: Player; compact?: boolean }) {
  if (player.blessings.length === 0) return null;
  return (
    <ul aria-label="Bênçãos" className="flex flex-wrap gap-1">
      {player.blessings.map(({ kind, turnsLeft }) => {
        const Icon = ICONS[kind];
        const { name, effect } = BLESSING_TEXT[kind];
        return (
          <li
            key={kind}
            title={`${name}: ${effect} (${turnsLeft === 1 ? "última rodada" : `mais ${turnsLeft} rodadas`})`}
            className={cn(
              "flex items-center gap-1 rounded-full bg-amber-200/15 font-bold text-amber-100 ring-1 ring-amber-200/30",
              compact ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]",
            )}
          >
            <Icon className={compact ? "size-2.5" : "size-3"} />
            {!compact && <span className="uppercase">{name}</span>}
            <span className="font-mono text-amber-200/80">{turnsLeft}</span>
          </li>
        );
      })}
    </ul>
  );
}
