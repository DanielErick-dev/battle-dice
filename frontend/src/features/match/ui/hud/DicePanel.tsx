import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RollView } from "../../model/matchView";
import { DiceFace } from "./DiceFace";

const ACTION_BUTTON =
  "h-12 w-full rounded-xl text-base font-black tracking-wider text-white shadow-lg transition-all active:scale-95 disabled:opacity-50";

interface DicePanelProps {
  activePlayerName: string;
  /** Last revealed roll; null before the first. */
  lastRoll: RollView | null;
  isRolling: boolean;
  isAnimating: boolean;
  isFinished: boolean;
  onRoll: () => void;
  onRestart: () => void;
}

export function DicePanel({
  activePlayerName,
  lastRoll,
  isRolling,
  isAnimating,
  isFinished,
  onRoll,
  onRestart,
}: DicePanelProps) {
  return (
    <section className="hud-panel flex w-full max-w-sm items-center gap-5 p-4">
      <div className="flex items-center gap-2">
        {isRolling || !lastRoll || (lastRoll.dice.length === 1 && lastRoll.bonus === 0 && lastRoll.multiplier === 1) ? (
          <DiceFace value={lastRoll?.dice[0] ?? null} rolling={isRolling} />
        ) : (
          <>
            {lastRoll.dice.map((value, index) => (
              <DiceFace
                key={index}
                value={value}
                rolling={false}
                compact
                // Oracle Eye: the discarded die fades out.
                className={cn(lastRoll.best && value < lastRoll.total && "opacity-35")}
              />
            ))}
            {lastRoll.bonus > 0 && <span className="text-lg font-black text-emerald-300">+{lastRoll.bonus}</span>}
            {lastRoll.multiplier > 1 && (
              <span className="text-lg font-black text-yellow-300" title="Fúria Adormecida">
                ×{lastRoll.multiplier}
              </span>
            )}
            <span className="text-2xl font-black text-orange-400" title={lastRoll.best ? "Vale o maior dado" : undefined}>
              ={lastRoll.total}
            </span>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <p className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
          {isFinished ? "Fim de jogo" : `Vez de ${activePlayerName}`}
        </p>

        {isFinished ? (
          <Button onClick={onRestart} disabled={isAnimating} className={cn(ACTION_BUTTON, "bg-emerald-500 hover:bg-emerald-400")}>
            JOGAR NOVAMENTE
          </Button>
        ) : (
          <Button onClick={onRoll} disabled={isAnimating} className={cn(ACTION_BUTTON, "bg-orange-600 hover:bg-orange-500")}>
            {isAnimating ? "MOVENDO..." : "ROLAR DADO"}
          </Button>
        )}

      </div>
    </section>
  );
}
