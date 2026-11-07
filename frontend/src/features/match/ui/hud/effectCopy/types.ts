import type { TileEffectKind, TileEffectView } from "../../../model/matchView";

export interface Copy {
  title: string;
  tone: string;
  subtitle: (effect: TileEffectView, name: string) => string;
}

/** A banner's copy, fixed or depending on the effect (which realm opened, which seal broke). */
export type CopyEntry = Copy | ((effect: TileEffectView) => Copy);

export type CopyEntries = Partial<Record<TileEffectKind, CopyEntry>>;
