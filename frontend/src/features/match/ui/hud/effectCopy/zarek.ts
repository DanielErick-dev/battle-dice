import { voidItemName } from "../../voidText";
import type { TileEffectView } from "../../../model/matchView";
import type { CopyEntries } from "./types";

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
} satisfies CopyEntries;
