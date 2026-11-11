import { TRAP_DRAIN_ENERGY } from "@/game/domain/board/harm";
import { WINGS_BONUS } from "@/game/domain/board/blessings";
import { BLESSING_ENERGY } from "@/game/domain/board/realms";
import type { Blessing, TrapCurse } from "@/game/domain/types";

export const CURSE_CAPTION: Readonly<Record<TrapCurse, string>> = {
  discard: "-1 CARTA",
  drain: `-${TRAP_DRAIN_ENERGY} ENERGIA`,
};

/** What each blessing tile says it gives (heaven's timed ones last BLESSING_TURNS rounds). */
export const BLESSING_CAPTION: Readonly<Record<Blessing, string>> = {
  energy: `+${BLESSING_ENERGY} ENERGIA`,
  charge: "+1 CARGA",
  shield: "ESCUDO",
  wings: `ASAS · +${WINGS_BONUS} CASAS`,
  halo: "AURÉOLA SAGRADA",
  inspiration: "INSPIRAÇÃO",
  spring: "FONTE DE LUZ",
};
