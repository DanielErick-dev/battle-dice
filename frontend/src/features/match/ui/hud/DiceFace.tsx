import { cn } from "@/lib/utils";

const PIPS: Record<number, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

interface DiceFaceProps {
  value: number | null;
  rolling: boolean;
}

export function DiceFace({ value, rolling }: DiceFaceProps) {
  const pips = PIPS[rolling ? 5 : (value ?? 0)] ?? [];

  return (
    <div
      aria-label={value && !rolling ? `Dado: ${value}` : "Dado"}
      className={cn(
        "grid size-20 grid-cols-3 grid-rows-3 place-items-center rounded-2xl p-3",
        "bg-gradient-to-br from-white to-zinc-300 shadow-[0_10px_30px_rgba(249,115,22,0.35),inset_0_-4px_0_rgba(0,0,0,0.15)]",
        rolling && "animate-dice-tumble",
        !rolling && value && "animate-in zoom-in-50 duration-300",
      )}
    >
      {value === null && !rolling ? (
        <span className="col-span-3 row-span-3 text-4xl font-black text-zinc-800">?</span>
      ) : (
        Array.from({ length: 9 }, (_, slot) => (
          <span
            key={slot}
            className={cn("size-3 rounded-full", pips.includes(slot) ? "bg-zinc-900" : "bg-transparent")}
          />
        ))
      )}
    </div>
  );
}
