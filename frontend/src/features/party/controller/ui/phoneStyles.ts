/** Shared class names for the phone: thumb-sized targets (at least 48px tall). */
export const PHONE = {
  // A deep indigo night with a warm glow at the top (the player's colour is laid over it in PhoneMatch).
  screen:
    "relative flex min-h-dvh w-full flex-col bg-[#161a33] bg-[radial-gradient(120%_60%_at_50%_0%,#3d2b6b_0%,transparent_70%),radial-gradient(90%_50%_at_50%_100%,#4d2617_0%,transparent_70%)] text-white select-none",
  column: "mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-4",
  primary:
    "h-14 w-full rounded-2xl bg-gradient-to-b from-orange-400 to-orange-600 text-lg font-black tracking-wider text-white uppercase shadow-lg ring-1 ring-orange-200/60 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] transition active:scale-[0.98] disabled:opacity-40",
  secondary:
    "h-12 w-full rounded-2xl bg-white/[0.16] text-sm font-bold tracking-wider text-zinc-50 uppercase ring-1 ring-white/25 transition active:bg-white/20 disabled:opacity-40",
  input:
    "h-12 w-full rounded-xl bg-white/[0.12] px-4 text-lg font-bold text-white ring-1 ring-white/30 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-orange-400",
  label: "text-xs font-black tracking-[0.2em] text-amber-200 uppercase",
  row: "flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white/[0.12] px-4 py-3 text-left ring-1 ring-white/20 transition active:bg-white/15 disabled:opacity-40",
} as const;

/** The phone's panels: lighter than the night behind them, so sections read as cards of their own. */
export const PHONE_PANEL =
  "rounded-2xl border border-white/25 bg-gradient-to-b from-white/[0.16] to-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md";
