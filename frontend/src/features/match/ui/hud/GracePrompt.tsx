import { GRACE_BLESSINGS } from "@/game/domain/seraph";
import type { TimedBlessing } from "@/game/domain/types";
import { BLESSING_TEXT, blessingDuration } from "../blessingText";
import { BLESSING_ICONS } from "./BlessingBadges";

interface GracePromptProps {
  /** Rounds the blessing will last on him. */
  turns: number;
  onPick: (blessing: TimedBlessing) => void;
}

/** Seraphiel on one of heaven's blessing tiles: he picks which blessing comes down on him. */
export function GracePrompt({ turns, onPick }: GracePromptProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="grace-title"
      className="animate-in fade-in pointer-events-auto absolute inset-0 z-40 grid place-items-center bg-black/45 p-4 backdrop-blur-[2px] duration-200"
    >
      <section className="hud-panel animate-in zoom-in-90 flex w-full max-w-sm flex-col gap-3 p-5 duration-200">
        <div className="text-center">
          <h2 id="grace-title" className="text-lg font-black tracking-wider text-amber-200 uppercase">
            O céu te ouve
          </h2>
          <p className="mt-1 text-sm text-zinc-300">
            Escolha a bênção que desce sobre você ({blessingDuration(turns)}).
          </p>
        </div>
        <ul className="flex flex-col gap-2">
          {GRACE_BLESSINGS.map((blessing) => {
            const Icon = BLESSING_ICONS[blessing];
            const { name, effect } = BLESSING_TEXT[blessing];
            return (
              <li key={blessing}>
                <button
                  type="button"
                  onClick={() => onPick(blessing)}
                  className="flex w-full items-center gap-3 rounded-xl bg-amber-200/[0.06] px-3 py-2.5 text-left ring-1 ring-amber-200/20 transition hover:bg-amber-200/15"
                >
                  <Icon className="size-5 shrink-0 text-amber-200 drop-shadow-[0_0_8px_rgba(253,230,138,0.7)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-amber-50">{name}</span>
                    <span className="block text-xs text-zinc-300">{effect}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
