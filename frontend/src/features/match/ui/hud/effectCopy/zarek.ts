import { voidItemName } from "../../voidText";
import type { TileEffectView } from "../../../model/matchView";
import type { CopyEntries } from "./types";
import { APEX_TURNS } from "@/game/domain/characters/zarek/apex";

function voidName({ void: held }: TileEffectView): string {
  return held?.item ? voidItemName(held.item) : "algo";
}

/** Zarek's Void. */
export const zarekCopy = {
  voidSwallowed: {
    title: "O VAZIO DEVOROU!",
    tone: "text-violet-300",
    subtitle: (effect, name) => `${name} guardou ${voidName(effect)} no Vazio`,
  },
  riftOpened: {
    title: "FENDA ABERTA!",
    tone: "text-violet-300",
    subtitle: ({ void: rift }, name) =>
      `${name} abriu uma casa nova no caminho${rift?.doubled ? ", com a penalidade dobrada" : ""}`,
  },
  voidCast: {
    title: "DO VAZIO!",
    tone: "text-violet-300",
    subtitle: (effect, name) => `${name} soltou ${voidName(effect)}, agora dele`,
  },
  voidSeized: {
    title: "O VAZIO TOMOU!",
    tone: "text-violet-300",
    subtitle: (effect, name) => `${name} absorveu ${voidName(effect)}: a casa virou armadilha roxa`,
  },
  voidEchoed: {
    title: "ECO DO VAZIO!",
    tone: "text-violet-300",
    subtitle: (effect, name) => `No Vazio de ${name}, ${voidName(effect)} agora são dois`,
  },
  voidApex: {
    title: "ÁPICE DO VAZIO!",
    tone: "text-violet-300",
    subtitle: ({ count }, name) =>
      count
        ? `${count} ${count === 1 ? "oponente cai" : "oponentes caem"} no Vazio: por ${APEX_TURNS} rodadas, os dados deles movem ${name}`
        : "Todos estavam protegidos",
  },
  voidRollTaken: {
    title: "O VAZIO ROUBOU O DADO!",
    tone: "text-violet-300",
    subtitle: ({ count }, name) => `${name} tirou ${count ?? 0}, mas quem anda é o Zarek`,
  },
} satisfies CopyEntries;
