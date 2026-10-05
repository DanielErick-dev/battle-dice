import {
  BLOOD_PACT_ENERGY,
  FLAME_ENERGY,
  FLAME_PUSH,
  FLAME_TILES,
  PLUNDER_CARDS,
  RUIN_PUSH,
} from "@/game/domain/abilities";
import { SEAL_KINDS } from "@/game/domain/seals";
import { SPECTER_KINDS } from "@/game/domain/specters";
import type { SealKind, SpecterKind } from "@/game/domain/types";

/** One thing to place on a tile: what it's called, what it does, its badge colour (class and hex), its tag on the board. */
export interface PlacementStep {
  name: string;
  effect: string;
  tone: string;
  color: string;
  tag: string;
}

/** Forbidden Seals, by kind (placed in SEAL_KINDS order). */
export const SEAL_TEXT: Readonly<Record<SealKind, PlacementStep>> = {
  tithe: {
    name: "Selo do Dízimo",
    effect: "Quem parar te entrega a melhor carta",
    tone: "bg-amber-500",
    color: "#f59e0b",
    tag: "Dízimo",
  },
  ruin: {
    name: "Selo da Ruína",
    effect: `Quem parar volta ${RUIN_PUSH} casas`,
    tone: "bg-red-600",
    color: "#dc2626",
    tag: "Ruína",
  },
  silence: {
    name: "Selo do Silêncio",
    effect: "Quem parar não joga cartas no próximo turno",
    tone: "bg-slate-500",
    color: "#64748b",
    tag: "Silêncio",
  },
  bloodPact: {
    name: "Pacto de Sangue",
    effect: `Quem parar te dá ${BLOOD_PACT_ENERGY} de energia`,
    tone: "bg-rose-700",
    color: "#be123c",
    tag: "Pacto",
  },
};

/** Spectral Apparitions, by kind (placed in SPECTER_KINDS order). */
export const SPECTER_TEXT: Readonly<Record<SpecterKind, PlacementStep>> = {
  plunder: {
    name: "Espectro da Pilhagem",
    effect: `Quem passar te deixa escolher ${PLUNDER_CARDS} cartas dele`,
    tone: "bg-sky-600",
    color: "#0284c7",
    tag: "Pilhagem",
  },
  hunger: {
    name: "Espectro da Fome",
    effect: "Quem passar perde toda a energia para você",
    tone: "bg-indigo-600",
    color: "#4f46e5",
    tag: "Fome",
  },
};

/** The seals in the order they're placed. */
export const SEAL_STEPS: readonly PlacementStep[] = SEAL_KINDS.map((kind) => SEAL_TEXT[kind]);
/** The apparitions in the order they're placed. */
export const SPECTER_STEPS: readonly PlacementStep[] = SPECTER_KINDS.map((kind) => SPECTER_TEXT[kind]);
/** Eternal Flames: one black fire per tile picked. */
export const FLAME_STEPS: readonly PlacementStep[] = Array.from({ length: FLAME_TILES }, (_, index) => ({
  name: `Chama negra ${index + 1}`,
  effect: `Quem parar perde ${FLAME_ENERGY} de energia e volta ${FLAME_PUSH} casas`,
  tone: "bg-red-700",
  color: "#b91c1c",
  tag: `Chama ${index + 1}`,
}));
