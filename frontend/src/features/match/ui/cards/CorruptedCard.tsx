import { cn } from "@/lib/utils";

/**
 * Where Unidade Alva's Corrupted Cards sit among `cards` real ones: after which real card each goes (-1 = on top),
 * spread through the hand so they read as having crept in.
 */
export function corruptedSlots(cards: number, corrupted: number): number[] {
  return Array.from({ length: corrupted }, (_, index) =>
    cards === 0 ? -1 : Math.min(cards - 1, Math.floor(((index + 1) * cards) / (corrupted + 1))),
  );
}

/** A Corrupted Card in the hand: card-shaped static, unplayable; it goes only by purging it (see CorruptedTray). */
export function CorruptedCard({ className }: { className?: string }) {
  return (
    <div
      title="Carta Corrompida: não pode ser jogada; conta na mão e deixa a Unidade Alva ver suas cartas"
      className={cn(
        "relative flex aspect-[5/7] w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl bg-black p-[3px] ring-2 ring-lime-400/70 select-none",
        "shadow-[0_0_16px_2px_rgba(163,230,53,0.35)]",
        className,
      )}
    >
      <div
        className="absolute inset-[3px] rounded-[9px] opacity-80"
        // Scanlines over a green glitch: the spyware's look.
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(163,230,53,0.18) 0 2px, transparent 2px 5px), linear-gradient(160deg, #1a2e05, #050a02 70%)",
        }}
      />
      <span className="relative animate-pulse text-2xl text-lime-300 drop-shadow-[0_0_6px_rgba(163,230,53,0.9)]">
        ☠
      </span>
      <span className="relative font-mono text-[10px] font-black tracking-widest text-lime-300 uppercase">
        Corrompida
      </span>
      <span className="relative font-mono text-[8px] text-lime-200/60">0x{"ERR".padEnd(6, "_")}</span>
    </div>
  );
}
