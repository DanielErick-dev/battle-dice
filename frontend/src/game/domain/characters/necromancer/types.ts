import type { CardInstance, PlayerId } from "@/game/domain/types";

export type NecromancerEvent = { type: "cardsResurrected"; playerId: PlayerId; cards: readonly CardInstance[] };
