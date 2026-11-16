/** Shared class names for the phone: thumb-sized targets (at least 48px tall). */
export const PHONE = {
  // A deep indigo night with a warm glow at the top (the player's colour is laid over it in PhoneMatch).
  screen:
    "relative flex min-h-dvh w-full flex-col bg-[#0b0d1c] bg-[radial-gradient(120%_60%_at_50%_0%,#2a1d4a_0%,transparent_70%),radial-gradient(90%_50%_at_50%_100%,#3b1d14_0%,transparent_70%)] text-white select-none",
  column: "mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-4",
  primary:
    "h-14 w-full rounded-2xl bg-gradient-to-b from-orange-500 to-orange-700 text-lg font-black tracking-wider text-white uppercase shadow-lg transition active:scale-[0.98] disabled:opacity-40",
  secondary:
    "h-12 w-full rounded-2xl bg-white/[0.12] text-sm font-bold tracking-wider text-zinc-50 uppercase ring-1 ring-white/25 transition active:bg-white/20 disabled:opacity-40",
  input:
    "h-12 w-full rounded-xl bg-white/5 px-4 text-lg font-bold text-white ring-1 ring-white/15 outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-orange-400",
  label: "text-[11px] font-black tracking-[0.2em] text-amber-200/90 uppercase",
  row: "flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white/[0.08] px-4 py-3 text-left ring-1 ring-white/20 transition active:bg-white/15 disabled:opacity-40",
} as const;

/** The phone's panels: lighter than the night behind them, so sections read as cards of their own. */
export const PHONE_PANEL =
  "rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.1] to-white/[0.04] shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md";
