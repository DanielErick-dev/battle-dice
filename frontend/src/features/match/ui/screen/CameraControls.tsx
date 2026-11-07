import { LocateFixed, Map as MapIcon, Scan, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CameraFraming } from "../../scene/camera/CameraRig";

/** The camera's framings, closest first: following the player up close, from midway, or the whole board. */
const FRAMINGS: readonly { framing: CameraFraming; label: string; Icon: LucideIcon }[] = [
  { framing: "close", label: "Perto", Icon: LocateFixed },
  { framing: "mid", label: "Médio", Icon: Scan },
  { framing: "board", label: "Tabuleiro", Icon: MapIcon },
];

interface CameraControlsProps {
  canFollow: boolean;
  framing: CameraFraming;
  freeLook: boolean;
  onPickFraming: (framing: CameraFraming) => void;
  onFollow: () => void;
}

/** Bottom left: the framing switch on boards large enough to follow, and the way back from looking around. */
export function CameraControls({ canFollow, framing, freeLook, onPickFraming, onFollow }: CameraControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 flex flex-wrap items-end gap-2 max-sm:bottom-auto max-sm:-top-14">
      {canFollow && (
        <div role="radiogroup" aria-label="Câmera" className="hud-panel pointer-events-auto flex gap-1 p-1">
          {FRAMINGS.map(({ framing: option, label, Icon }) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={framing === option}
              onClick={() => onPickFraming(option)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold tracking-wider uppercase transition-colors",
                framing === option ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      )}
      {freeLook && (
        <button
          type="button"
          onClick={onFollow}
          className="hud-panel pointer-events-auto flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold tracking-wider text-amber-200 uppercase transition-colors hover:text-white"
        >
          <LocateFixed className="size-4" />
          Meu personagem
        </button>
      )}
    </div>
  );
}
