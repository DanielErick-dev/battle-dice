import type { BoardPreset } from "../../boards";
import { cn } from "@/lib/utils";

interface BoardPickerProps {
  presets: readonly BoardPreset[];
  selectedId: string;
  disabled: boolean;
  onSelect: (id: string) => void;
}

/** Choosing a board starts a new match on it. */
export function BoardPicker({ presets, selectedId, disabled, onSelect }: BoardPickerProps) {
  return (
    <div role="radiogroup" aria-label="Tabuleiro" className="flex flex-wrap gap-1">
      {presets.map((preset) => {
        const selected = preset.id === selectedId;
        return (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onSelect(preset.id)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              selected ? "bg-orange-500/20 ring-1 ring-orange-500/60" : "hover:bg-white/10",
            )}
          >
            <span className="block text-[11px] leading-none font-bold tracking-wider uppercase">{preset.name}</span>
            <span className="mt-1 block text-[10px] leading-none text-zinc-500">{preset.definition.size} casas</span>
          </button>
        );
      })}
    </div>
  );
}
