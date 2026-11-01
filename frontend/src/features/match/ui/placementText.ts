import { BLOOD_PACT_ENERGY, RUIN_PUSH, SEAL_KINDS } from "@/game/domain/characters/scribe/seals";
import { FLAME_ENERGY, FLAME_PUSH, FLAME_TILES } from "@/game/domain/characters/kage/flames";
import { PLUNDER_CARDS, SPECTER_KINDS } from "@/game/domain/characters/warden/specters";
import { WINTER_PICKS, ENCHANT_ADVANCE, ENCHANT_FREEZE } from "@/game/domain/characters/fairy/winter";
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
/** Eternal Winter: one tile frozen per pick. */
export const FROST_STEPS: readonly PlacementStep[] = Array.from({ length: WINTER_PICKS }, (_, index) => ({
  name: `Gelo ${index + 1}`,
  effect: `Igual à neve: o oponente fica preso ${ENCHANT_FREEZE} rodadas, você avança ${ENCHANT_ADVANCE}`,
  tone: "bg-sky-500",
  color: "#0ea5e9",
  tag: `Gelo ${index + 1}`,
}));

/** Zarek's idle Void taking over a spell on the board. */
export const VOID_SEIZE_STEP: PlacementStep = {
  name: "Casa enfeitiçada",
  effect: "O Vazio toma o fogo, a neve, o gelo, o selo ou a aparição dela",
  tone: "bg-violet-600",
  color: "#8b5cf6",
  tag: "Vazio",
};

/** Where the Void sets down what it holds: a harm opens a rift right after the tile, a spell lands on it. */
export function voidReleaseStep(name: string, harm: boolean, doubled: boolean): PlacementStep {
  return {
    name: harm ? "Fenda" : "Casa",
    effect: harm
      ? `Uma casa nova (${name}${doubled ? ", dobrada" : ""}) abre logo depois desta`
      : `${name[0]?.toUpperCase() ?? ""}${name.slice(1)} pousa aqui e passa a ser seu`,
    tone: "bg-violet-600",
    color: "#8b5cf6",
    tag: harm ? "Fenda" : "Vazio",
  };
}
