import { cardCost, rarityLevel, type CardId } from "../../cards/catalog";
import { feedCondenser, openGraveyard } from "./condenser";
import { throwOnPile } from "../../cards/decks";
import { GameRuleError, type GameErrorCode } from "../../core/errors";
import { moveTo, playerIn, updatePlayer, type Draft } from "../../core/draft";
import { isUntouchable } from "../../core/playerStatus";
import { resolveLanding } from "../../board/landing";
import { clipAtWalls } from "../tenzai/elements";
import type { CardInstance, Player, PlayerId } from "../../core/state";
import {
  corruptGift,
  isNegativeTile,
  isPositiveTile,
  OPUS_INVERSION_TURNS,
  startInversion,
  tableOf,
  tileAhead,
  type TileTable,
  turnInHerFavour,
} from "./inversion";

/** How far ahead the Catalytic Step and the Polarity Contamination look for their tile. */
export const ALCHEMY_REACH = 12;
/** Cards the Graveyard Raider and the Magnum Opus take from anyone's graveyard. */
export const RAIDER_PICKS = 2;
export const OPUS_PICKS = 3;

/** Why one of her cards can't be played right now (the board, not the target: see strictEquivalence). */
export function alchemyBlocker(table: TileTable, player: Player, cardId: CardId): GameErrorCode | null {
  switch (cardId) {
    case "catalyticStep":
      return tileAhead(table.board, player, ALCHEMY_REACH, (tile) => isNegativeTile(table, tile))
        ? null
        : "NO_HARM_TILE_AHEAD";
    case "strictEquivalence":
      return isNegativeTile(table, player.position) ? null : "NOT_ON_HARM_TILE";
    default:
      return null;
  }
}

/** Catalytic Step: on to the first harm ahead, which turns into its opposite boon for her. */
export function catalyticStep(draft: Draft, playerId: PlayerId): void {
  const table = tableOf(draft);
  const found = tileAhead(table.board, playerIn(draft, playerId), ALCHEMY_REACH, (tile) => isNegativeTile(table, tile));
  if (!found) throw new GameRuleError("NO_HARM_TILE_AHEAD");
  if (!walkTo(draft, playerId, found.path)) return;
  turnInHerFavour(draft, playerId, found.tile);
}

/** Polarity Contamination: the target runs on to the nearest gift ahead of them, which turns into its harm. */
export function contaminate(draft: Draft, playerId: PlayerId, targetId: PlayerId): void {
  const table = tableOf(draft);
  const found = tileAhead(table.board, playerIn(draft, targetId), ALCHEMY_REACH, (tile) => isPositiveTile(table, tile));
  if (!found) throw new GameRuleError("NO_GIFT_TILE_AHEAD");
  if (!walkTo(draft, targetId, found.path)) return;
  corruptGift(draft, targetId, found.tile, playerId);
}

/** Strict Equivalence: she on a harm, the target off one, they trade places; it strikes them and turns for her. */
export function strictEquivalence(draft: Draft, playerId: PlayerId, targetId: PlayerId): void {
  const self = playerIn(draft, playerId);
  const target = playerIn(draft, targetId);
  const table = tableOf(draft);
  if (!isNegativeTile(table, self.position)) throw new GameRuleError("NOT_ON_HARM_TILE");
  if (isNegativeTile(table, target.position)) throw new GameRuleError("TARGET_ON_HARM_TILE");
  const harm = self.position;
  draft.events.push(
    { type: "cardTeleported", playerId, from: harm, to: target.position },
    { type: "cardTeleported", playerId: targetId, from: target.position, to: harm },
  );
  updatePlayer(draft, playerId, () => ({ position: target.position, realmEntry: target.realmEntry }));
  updatePlayer(draft, targetId, () => ({ position: harm, realmEntry: self.realmEntry }));
  // Her boon first, read off the harm while it's still there (a hidden trap moves once it strikes).
  turnInHerFavour(draft, playerId, harm);
  resolveLanding(draft, targetId, harm);
}

/** The Magnum Opus: her hand burnt, each opponent's best card gone, three picks from any graveyard, a long Inversion. */
export function magnumOpus(draft: Draft, playerId: PlayerId): void {
  const burnt = [...playerIn(draft, playerId).hand];
  updatePlayer(draft, playerId, (player) => ({ hand: [], discard: throwOnPile(player.discard, burnt) }));
  const taken: { from: PlayerId; card: CardInstance }[] = [];
  for (const opponent of draft.players.filter((player) => player.id !== playerId && !isUntouchable(player))) {
    const best = bestCard(opponent.hand);
    if (!best) continue;
    updatePlayer(draft, opponent.id, (player) => ({
      hand: player.hand.filter((card) => card.uid !== best.uid),
      discard: throwOnPile(player.discard, [best]),
    }));
    taken.push({ from: opponent.id, card: best });
  }
  draft.events.push({ type: "magnumOpus", playerId, burnt, taken });
  feedCondenser(draft, burnt.length + taken.length);
  startInversion(draft, playerId, OPUS_INVERSION_TURNS);
  openGraveyard(draft, playerId, OPUS_PICKS, false);
}

export function raidGraveyards(draft: Draft, playerId: PlayerId): void {
  openGraveyard(draft, playerId, RAIDER_PICKS, false);
}

/** The rarest card, the dearest among equals (relics count as the rarest there is). */
function bestCard(hand: readonly CardInstance[]): CardInstance | null {
  const score = (card: CardInstance) => rarityLevel(card.cardId) * 100 + cardCost(card.cardId);
  return [...hand].sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** Walks `path` (Tenzai's walls still stop it); true when it reached its end. */
function walkTo(draft: Draft, playerId: PlayerId, path: readonly number[]): boolean {
  const { path: walked } = clipAtWalls(draft, playerId, path);
  if (walked.length > 0) {
    draft.events.push({ type: "playerMoved", playerId, path: walked });
    moveTo(draft, playerId, walked.at(-1) ?? playerIn(draft, playerId).position);
  }
  return walked.length === path.length;
}
