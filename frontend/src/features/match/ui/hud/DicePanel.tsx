import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DiceFace } from "./DiceFace";

const ACTION_BUTTON =
  "h-12 w-full rounded-xl text-base font-black tracking-wider text-white shadow-lg transition-all active:scale-95 disabled:opacity-50";

interface DicePanelProps {
  activePlayerName: string;
  /** Faces of the last roll (two under Kaioken); empty before the first. */
  lastRoll: readonly number[];
  isRolling: boolean;
  isAnimating: boolean;
  isFinished: boolean;
  error: string | null;
  onRoll: () => void;
  onRestart: () => void;
}

export function DicePanel({
  activePlayerName,
  lastRoll,
  isRolling,
  isAnimating,
  isFinished,
  error,
  onRoll,
  onRestart,
}: DicePanelProps) {
  return (
    <section className="hud-panel flex w-full max-w-sm items-center gap-5 p-4">
      <div className="flex items-center gap-2">
        {isRolling || lastRoll.length <= 1 ? (
          <DiceFace value={lastRoll[0] ?? null} rolling={isRolling} />
        ) : (
          <>
            {lastRoll.map((value, index) => (
              <DiceFace key={index} value={value} rolling={false} compact />
            ))}
            <span className="text-2xl font-black text-orange-400">
              ={lastRoll.reduce((sum, value) => sum + value, 0)}
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

        {error && <p className="text-xs font-semibold text-red-400">{error}</p>}
      </div>
    </section>
  );
}
