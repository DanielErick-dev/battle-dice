import type { CardInstance, PlayerId } from "../../core/state";

/** `from` and `sacrificed` left the hand; `to` took `from`'s place. */
export type AlchemistEvent = {
  type: "cardTransmuted";
  playerId: PlayerId;
  from: CardInstance;
  sacrificed: CardInstance;
  to: CardInstance;
};
