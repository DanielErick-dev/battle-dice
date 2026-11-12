import { cn } from "@/lib/utils";

/** A character's portrait stand-in: their accent colour and initial (the characters only exist as 3D models). */
export function Avatar({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid size-11 shrink-0 place-items-center rounded-full text-lg font-black text-white", className)}
      style={{
        background: `radial-gradient(circle at 35% 30%, ${color}, #0a0a12 85%)`,
        boxShadow: `0 0 14px ${color}`,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
