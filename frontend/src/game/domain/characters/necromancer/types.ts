import type { CardInstance, PlayerId } from "../../core/state";

export type NecromancerEvent = { type: "cardsResurrected"; playerId: PlayerId; cards: readonly CardInstance[] };
