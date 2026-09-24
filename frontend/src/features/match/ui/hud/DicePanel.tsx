import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DiceFace } from "./DiceFace";

const ACTION_BUTTON =
  "h-12 w-full rounded-xl text-base font-black tracking-wider text-white shadow-lg transition-all active:scale-95 disabled:opacity-50";

interface DicePanelProps {
  activePlayerName: string;
  lastRoll: number | null;
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
      <DiceFace value={lastRoll} rolling={isRolling} />

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
