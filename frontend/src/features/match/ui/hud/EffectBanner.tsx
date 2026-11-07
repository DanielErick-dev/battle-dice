import type { TileEffectView } from "../../model/matchView";
import { effectCopyOf } from "./effectCopy";

interface EffectBannerProps {
  effect: TileEffectView | null;
  winnerName: string | null;
  nameOf: (playerId: string) => string | null;
}

export function EffectBanner({ effect, winnerName, nameOf }: EffectBannerProps) {
  if (winnerName) {
    return (
      <Banner key="winner" persistent title="VITÓRIA!" subtitle={`${winnerName} chegou ao fim`} tone="text-amber-300" />
    );
  }
  if (!effect) return null;

  const copy = effectCopyOf(effect);
  return (
    <Banner
      key={`${effect.kind}:${effect.from}:${effect.to}:${effect.playerId}`}
      title={copy.title}
      subtitle={copy.subtitle(effect, nameOf(effect.playerId) ?? "")}
      tone={copy.tone}
    />
  );
}

interface BannerProps {
  title: string;
  subtitle: string;
  tone: string;
  persistent?: boolean;
}

function Banner({ title, subtitle, tone, persistent = false }: BannerProps) {
  return (
    <div
      role="status"
      className={`pointer-events-none flex flex-col items-center ${persistent ? "animate-in zoom-in-75 fade-in duration-500" : "animate-banner"}`}
    >
      <span className={`text-6xl font-black tracking-tight italic drop-shadow-[0_0_25px_currentColor] ${tone}`}>
        {title}
      </span>
      <span className="mt-2 rounded-full bg-black/60 px-4 py-1 text-sm font-bold tracking-widest text-zinc-100 uppercase backdrop-blur-sm">
        {subtitle}
      </span>
    </div>
  );
}
