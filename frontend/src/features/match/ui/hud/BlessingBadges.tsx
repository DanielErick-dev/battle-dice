import { Crown, Droplet, Feather, Sparkle, Sun, type LucideIcon } from "lucide-react";
import { CROWN_BONUS } from "@/game/domain/seraph";
import type { Player, TimedBlessing } from "@/game/domain/types";
import { cn } from "@/lib/utils";
import { BLESSING_TEXT } from "../blessingText";

export const BLESSING_ICONS: Readonly<Record<TimedBlessing, LucideIcon>> = {
  wings: Feather,
  halo: Sun,
  inspiration: Sparkle,
  spring: Droplet,
};

/**
 * Heaven's blessings on a player, one gold chip each with the rounds it has left, after Seraphiel's
 * crown when he wears one; nothing when there are none. `waiting`: still in heaven, so they're dimmed and say they start on the way out.
 * `compact` drops the names (the players list).
 */
export function BlessingBadges({
  player,
  waiting = false,
  compact = false,
}: {
  player: Player;
  waiting?: boolean;
  compact?: boolean;
}) {
  if (player.blessings.length === 0 && !player.crown) return null;
  const infernal = player.crown === "infernal";
  return (
    <ul aria-label="Bênçãos" className="flex flex-wrap gap-1">
      {player.crown && (
        <li
          title={`${infernal ? "Coroa Infernal" : "Coroa Seráfica"}: +${CROWN_BONUS} casa em toda rolagem, até o fim da partida`}
          className={cn(
            "flex items-center gap-1 rounded-full font-bold ring-1",
            infernal
              ? "bg-red-500/15 text-red-200 ring-red-400/40"
              : "bg-amber-200/15 text-amber-100 ring-amber-200/30",
            compact ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]",
          )}
        >
          <Crown className={compact ? "size-2.5" : "size-3"} />
          {!compact && <span className="uppercase">{infernal ? "Coroa Infernal" : "Coroa Seráfica"}</span>}
          <span className="font-mono opacity-80">+{CROWN_BONUS}</span>
        </li>
      )}
      {player.blessings.map(({ kind, turnsLeft }, index) => {
        const Icon = BLESSING_ICONS[kind];
        const { name, effect } = BLESSING_TEXT[kind];
        return (
          <li
            key={`${kind}-${index}`}
            title={`${name}: ${effect} (${
              waiting
                ? `começa ao sair do céu, por ${turnsLeft} rodadas`
                : turnsLeft === 1
                  ? "última rodada"
                  : `mais ${turnsLeft} rodadas`
            })`}
            className={cn(
              "flex items-center gap-1 rounded-full bg-amber-200/15 font-bold text-amber-100 ring-1 ring-amber-200/30",
              waiting && "opacity-50",
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
