import { BLOOD_PACT_ENERGY, PLUNDER_CARDS, RUIN_PUSH } from "@/game/domain/abilities";
import { SEAL_KINDS } from "@/game/domain/seals";
import { SPECTER_KINDS } from "@/game/domain/specters";
import type { SealKind, SpecterKind } from "@/game/domain/types";

/** One thing to place on a tile: what it's called, what it does, its badge colour. */
export interface PlacementStep {
  name: string;
  effect: string;
  tone: string;
}

/** Forbidden Seals, by kind (placed in SEAL_KINDS order). */
export const SEAL_TEXT: Readonly<Record<SealKind, PlacementStep>> = {
  tithe: { name: "Selo do Dízimo", effect: "Quem parar te entrega a melhor carta", tone: "bg-amber-500" },
  ruin: { name: "Selo da Ruína", effect: `Quem parar volta ${RUIN_PUSH} casas`, tone: "bg-red-600" },
  silence: { name: "Selo do Silêncio", effect: "Quem parar não joga cartas no próximo turno", tone: "bg-slate-500" },
  bloodPact: {
    name: "Pacto de Sangue",
    effect: `Quem parar te dá ${BLOOD_PACT_ENERGY} de energia`,
    tone: "bg-rose-700",
  },
};

/** Spectral Apparitions, by kind (placed in SPECTER_KINDS order). */
export const SPECTER_TEXT: Readonly<Record<SpecterKind, PlacementStep>> = {
  plunder: {
    name: "Espectro da Pilhagem",
    effect: `Quem passar te deixa escolher ${PLUNDER_CARDS} cartas dele`,
    tone: "bg-sky-600",
  },
  hunger: { name: "Espectro da Fome", effect: "Quem passar perde toda a energia para você", tone: "bg-indigo-600" },
};

/** The seals in the order they're placed. */
export const SEAL_STEPS: readonly PlacementStep[] = SEAL_KINDS.map((kind) => SEAL_TEXT[kind]);
/** The apparitions in the order they're placed. */
export const SPECTER_STEPS: readonly PlacementStep[] = SPECTER_KINDS.map((kind) => SPECTER_TEXT[kind]);
