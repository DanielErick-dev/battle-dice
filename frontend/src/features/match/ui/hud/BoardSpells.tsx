import { BROWNOUT_TURNS, isBlackedOut } from "@/game/domain/characters/alva/systems";
import type { Player } from "@/game/domain/types";
import type { Inversion } from "@/game/domain/characters/alchemist/types";
import { cn } from "@/lib/utils";

interface BoardSpellsProps {
  players: readonly Player[];
  activePlayerId: string;
  inversion: Inversion | null;
}

/** Rounds of Unidade Alva's Blackout still to go: the longest any victim has left (0 when nobody is out). */
export function blackoutRoundsLeft(players: readonly Player[]): number {
  return Math.max(0, ...players.filter(isBlackedOut).map((player) => player.emp - BROWNOUT_TURNS));
}

/** Rounds of the Alchemist's Inversion still to go, as her badge counts them. */
export function inversionRoundsLeft(inversion: Inversion | null, activePlayerId: string): number {
  if (!inversion) return 0;
  return Math.max(1, inversion.turnsLeft - (activePlayerId === inversion.owner ? 1 : 0));
}

/**
 * Spells hanging over the whole board, so nobody wonders whether they still hold: the screen's edge glows in their
 * colour and a tag up top says how many rounds are left (Unidade Alva's Blackout, the Alchemist's Inversion).
 */
export function BoardSpells({ players, activePlayerId, inversion }: BoardSpellsProps) {
  const blackout = blackoutRoundsLeft(players);
  const inverted = inversionRoundsLeft(inversion, activePlayerId);
  if (blackout === 0 && inverted === 0) return null;
  const rounds = (count: number) => (count === 1 ? "1 rodada" : `${count} rodadas`);

  return (
    <>
      {blackout > 0 && (
        <div className="pointer-events-none fixed inset-0 z-10 animate-pulse shadow-[inset_0_0_60px_8px_rgba(56,189,248,0.45)]" />
      )}
      {inverted > 0 && (
        <div
          className={cn(
            "pointer-events-none fixed inset-0 z-10 shadow-[inset_0_0_70px_10px_rgba(16,185,129,0.4)]",
            blackout > 0 && "inset-3",
          )}
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center gap-2 px-4 sm:top-5">
        {blackout > 0 && (
          <span className="rounded-full bg-sky-950/85 px-3 py-1 text-[11px] font-black tracking-widest text-sky-200 uppercase ring-1 ring-sky-400/60">
            ⚡ Apagão · {rounds(blackout)}
          </span>
        )}
        {inverted > 0 && (
          <span className="rounded-full bg-emerald-950/85 px-3 py-1 text-[11px] font-black tracking-widest text-emerald-200 uppercase ring-1 ring-emerald-400/60">
            ⚗️ Tabuleiro invertido · {rounds(inverted)}
          </span>
        )}
      </div>
    </>
  );
}
