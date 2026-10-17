import { ARMOUR_TURNS, FLAME_TILES, FLAME_TURNS } from "@/game/domain/abilities";
import { TargetPicker } from "../hud/TargetPicker";
import type { AbilityFlow } from "./types";

/** Despertar Ocular: black fire on tiles Kage Rubra picks next, or Spectral Armour at once. */
export const ocularAwakening: AbilityFlow = {
  start: () => "picker",
  Picker: ({ ctx }) => (
    <TargetPicker
      title="Despertar Ocular"
      tone="text-orange-400"
      subtitle="Escolha o poder que seus olhos despertam."
      alternatives={[
        {
          label: "Chamas Eternas",
          detail: `fogo negro em ${FLAME_TILES} casas por ${FLAME_TURNS} rodadas`,
          onPick: () => ctx.place("flames"),
        },
        {
          label: "Armadura Espectral",
          detail: `imune aos outros por ${ARMOUR_TURNS} rodadas`,
          onPick: () => ctx.use({ power: "armour" }),
        },
      ]}
      onCancel={ctx.cancel}
    />
  ),
};
