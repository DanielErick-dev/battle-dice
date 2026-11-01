import { RESURRECTION_CARDS } from "@/game/domain/characters/necromancer/resurrection";
import { TRANSMUTATION_CARDS } from "@/game/domain/characters/alchemist/transmutation";
import { HAND_LIMIT } from "@/game/domain/cards/hand";
import { MAX_RARITY_LEVEL } from "@/game/domain/cards/catalog";
import { CardChoicePicker } from "../cards/CardChoicePicker";
import type { AbilityFlow } from "./types";

/** Transmutação: the hand cards to sacrifice. */
export const transmutation: AbilityFlow = {
  // A hand too thin to sacrifice from leaves nothing to pick: it distils a card straight away.
  start: ({ player }) => (player.hand.length >= TRANSMUTATION_CARDS ? "picker" : null),
  Picker: ({ ctx }) => (
    <CardChoicePicker
      title="Transmutação"
      subtitle={`Sacrifique ${TRANSMUTATION_CARDS} cartas: os níveis delas se somam numa carta aleatória desse nível (ex.: duas de nível 2 viram uma de nível 4; máximo ${MAX_RARITY_LEVEL}).`}
      accent="emerald"
      cards={ctx.player.hand}
      max={TRANSMUTATION_CARDS}
      required
      confirmLabel="Transmutar"
      onPick={(cardUids) => ctx.use({ cardUids })}
      onCancel={ctx.cancel}
    />
  ),
};

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
