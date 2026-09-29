import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The night-sky backdrop every menu screen shares: stars, a sea haze below and, on the
 * main menu, the moon (kept off pages full of text, where it would sit behind it).
 */
export function MenuBackdrop({ moon = true }: { moon?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,#2e1f5e_0%,#120e2a_45%,#05060b_80%)]" />
      <div className="menu-stars absolute inset-0 opacity-70" />
      {moon && <div className="absolute top-[8%] right-[12%] size-40 rounded-full bg-[radial-gradient(circle,#fef3c7_0%,#fde68a55_35%,transparent_70%)] blur-sm sm:size-56" />}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(to_top,#0b1a3a_0%,#0b1a3a88_40%,transparent_100%)]" />
    </div>
  );
}

/** A secondary menu page: backdrop, a back link to the main menu, a title and the content. */
export function MenuPage({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden bg-[#05060b] text-white">
      <MenuBackdrop moon={false} />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Voltar ao menu"
            className="grid size-10 place-items-center rounded-xl bg-white/5 text-zinc-300 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl leading-none font-black tracking-[0.15em] uppercase sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-zinc-400">{subtitle}</p>}
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
