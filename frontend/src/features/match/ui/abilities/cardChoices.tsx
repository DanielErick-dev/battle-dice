import { RESURRECTION_CARDS } from "@/game/domain/characters/necromancer/resurrection";
import { HAND_LIMIT } from "@/game/domain/cards/hand";
import { CardChoicePicker } from "../cards/CardChoicePicker";
import type { AbilityFlow } from "./types";

/** Ressurreição: the discarded cards to bring back. */
export const resurrection: AbilityFlow = {
  start: () => "picker",
  Picker: ({ ctx }) => (
    <CardChoicePicker
      title="Ressurreição"
      subtitle="Escolha cartas já jogadas: elas voltam para a sua mão."
      accent="teal"
      // Newest first: the cards just played are the ones most often wanted back.
      cards={[...ctx.player.discard].reverse()}
      max={Math.min(RESURRECTION_CARDS, HAND_LIMIT - ctx.player.hand.length)}
      confirmLabel="Trazer de volta"
      onPick={(cardUids) => ctx.use({ cardUids })}
      onCancel={ctx.cancel}
    />
  ),
};
