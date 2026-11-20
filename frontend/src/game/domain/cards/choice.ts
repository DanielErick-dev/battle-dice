import { CARD_CATALOG, type CardId } from "./catalog";
import { GameRuleError } from "../core/errors";
import { opponentsInSpace } from "../board/reach";
import type { Draft } from "../core/draft";
import { DICE_SIDES } from "../core/dice";
import { dragTargets } from "../characters/seraphiel/seraph";
import { riftBehind, type HarmTable } from "./exclusive";
import { mirageFire } from "../characters/kage/cards";
import { slideTile } from "../characters/fairy/cards";
import type { Element } from "../characters/tenzai/types";
import type { CardInstance, Player, PlayerId } from "../core/state";

export interface CardChoice {
  targetId?: PlayerId;
  value?: number;
  /** Hand cards burnt to pay for a card that asks for them (see CardDefinition.sacrifices). */
  sacrificeUids?: readonly string[];
  /** What Tenzai's Elemental Exchange turns into. */
  element?: Element;
}

/** Anyone in the same place, protected or not; the Call of the Abyss only reaches the main path (see dragTargets). */
export function cardTargets(
  table: Pick<HarmTable, "board" | "blackFlames" | "enchantedTiles" | "winter" | "scarletFlames">,
  players: readonly Player[],
  playerId: PlayerId,
  cardId: CardId,
): Player[] {
  const { board, blackFlames } = table;
  const inSpace = opponentsInSpace(board, players, playerId);
  // Only those close enough to her snow or ice can slide onto it.
  if (cardId === "slipperyTrack") return inSpace.filter((player) => slideTile(table, playerId, player) !== null);
  // Only those close enough to one of her black fires can be lured onto it.
  if (cardId === "scarletMirage")
    return inSpace.filter((player) => mirageFire(board, blackFlames, playerId, player) !== null);
  // Only those with one of the player's rifts somewhere behind them can be called back to it.
  if (cardId === "riftCall") return inSpace.filter((player) => riftBehind(board, player, playerId) !== null);
  if (cardId !== "abyssCall") return inSpace;
  const draggable = new Set(dragTargets(board, players, playerId).map((player) => player.id));
  return inSpace.filter((player) => draggable.has(player.id));
}

export function validTarget(
  draft: Draft,
  playerId: PlayerId,
  cardId: CardId,
  targetId: PlayerId | undefined,
): PlayerId {
  const target = cardTargets(
    {
      board: draft.state.board,
      blackFlames: draft.blackFlames,
      enchantedTiles: draft.enchantedTiles,
      winter: draft.winter,
      scarletFlames: draft.scarletFlames,
    },
    draft.players,
    playerId,
    cardId,
  ).find((player) => player.id === targetId);
  if (!target) throw new GameRuleError("INVALID_TARGET");
  return target.id;
}

export function validSacrifices(
  hand: readonly CardInstance[],
  card: CardInstance,
  uids: readonly string[] = [],
): CardInstance[] {
  const needed = CARD_CATALOG[card.cardId].sacrifices ?? 0;
  const picked = hand.filter((held) => held.uid !== card.uid && uids.includes(held.uid));
  if (picked.length !== needed || new Set(uids).size !== needed) throw new GameRuleError("INVALID_SACRIFICE");
  return picked;
}

export function validValue(value: number | undefined): number {
  if (value === undefined || !Number.isInteger(value) || value < 1 || value > DICE_SIDES) {
    throw new GameRuleError("INVALID_VALUE");
  }
  return value;
}
