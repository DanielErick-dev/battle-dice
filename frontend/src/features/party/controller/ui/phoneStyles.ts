/** Shared class names for the phone: thumb-sized targets (at least 48px tall). */
export const PHONE = {
  screen: "relative flex min-h-dvh w-full flex-col bg-[#05060b] text-white select-none",
  column: "mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-4",
  primary:
    "h-14 w-full rounded-2xl bg-orange-600 text-lg font-black tracking-wider text-white uppercase shadow-lg transition active:scale-[0.98] disabled:opacity-40",
  secondary:
    "h-12 w-full rounded-2xl bg-white/10 text-sm font-bold tracking-wider text-zinc-100 uppercase ring-1 ring-white/15 transition active:bg-white/20 disabled:opacity-40",
  input:
    "h-12 w-full rounded-xl bg-white/5 px-4 text-lg font-bold text-white ring-1 ring-white/15 outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-orange-400",
  label: "text-[11px] font-black tracking-[0.2em] text-zinc-400 uppercase",
  row: "flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white/[0.05] px-4 py-3 text-left ring-1 ring-white/10 transition active:bg-white/15 disabled:opacity-40",
} as const;
