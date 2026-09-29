import {
  ANCIENT_SCROLL_DRAWS,
  ARCANE_BLAST_PUSH,
  AWAKENING_BONUS,
  AWAKENING_ROLLS,
  CARD_CATALOG,
  cardCost,
  HEALING_HERB_ENERGY,
  LUCKY_CHARM_BONUS,
  MAX_ENERGY,
  WIND_STEP_TILES,
  type CardId,
} from "./cards";
import { cardsPerTurn } from "./abilities";
import { GameRuleError, type GameErrorCode } from "./commands";
import { mainTileOf } from "./board";
import { drawCard, playerIn, pushPath, updatePlayer, walkPath, type Draft } from "./draft";
import { DICE_SIDES } from "./dice";
import { resolveLanding } from "./landing";
import type { Board, CardInstance, Player, PlayerId, TileId } from "./types";

export interface CardChoice {
  targetId?: PlayerId;
  value?: number;
}

/**
 * Why `player` can't play this card right now because of their own state (energy, an effect
 * already up, no portal left ahead), or null. The turn rules (cards per turn…) are checked on
 * play; the UI asks this to grey cards out with the same reasons the engine enforces.
 */
export function cardBlocker(board: Board, player: Player, cardId: CardId): GameErrorCode | null {
  if (player.energy < cardCost(cardId)) return "NOT_ENOUGH_ENERGY";
  if (cardId === "arcaneShield" && player.shielded) return "ALREADY_SHIELDED";
  if (CARD_CATALOG[cardId].boostsDice && player.diceBoost !== null) return "DICE_BOOST_ACTIVE";
  if (cardId === "mysticGate" && nextPortalAhead(board, player.position) === null) return "NO_PORTAL_AHEAD";
  return null;
}

/**
 * Validates and pays for a card (energy, one per turn), then applies its effect to the draft.
 * Movement cards resolve the tile they end on, like a roll would.
 */
export function playCard(draft: Draft, playerId: PlayerId, cardUid: string, choice: CardChoice): void {
  const { board, cardsPlayedThisTurn, abilityInUse } = draft.state;
  const player = playerIn(draft, playerId);
  if (cardsPlayedThisTurn >= cardsPerTurn(abilityInUse)) throw new GameRuleError("CARD_ALREADY_PLAYED");

  const card = player.hand.find((candidate) => candidate.uid === cardUid);
  if (!card) throw new GameRuleError("UNKNOWN_CARD");
  const blocker = cardBlocker(board, player, card.cardId);
  if (blocker) throw new GameRuleError(blocker);

  const definition = CARD_CATALOG[card.cardId];
  const targetId = definition.targetsOpponent ? validTarget(draft, playerId, choice.targetId) : null;
  const value = definition.needsValue ? validValue(choice.value) : null;
  const portal = card.cardId === "mysticGate" ? nextPortalAhead(board, player.position) : null;

  updatePlayer(draft, playerId, (current) => ({
    energy: current.energy - cardCost(card.cardId),
    hand: current.hand.filter((candidate) => candidate.uid !== cardUid),
    discard: [...current.discard, card],
  }));
  draft.events.push({ type: "cardPlayed", playerId, card, targetId, value });
  applyEffect(draft, playerId, card, { targetId, value, portal });
}

function applyEffect(
  draft: Draft,
  playerId: PlayerId,
  card: CardInstance,
  { targetId, value, portal }: { targetId: PlayerId | null; value: number | null; portal: TileId | null },
): void {
  const { board } = draft.state;
  const position = playerIn(draft, playerId).position;

  switch (card.cardId) {
    case "windStep": {
      const path = walkPath(board, position, WIND_STEP_TILES);
      draft.events.push({ type: "playerMoved", playerId, path });
      resolveLanding(draft, playerId, path.at(-1) ?? position);
      break;
    }
    case "healingHerb":
      updatePlayer(draft, playerId, (player) => ({
        energy: Math.min(MAX_ENERGY, player.energy + HEALING_HERB_ENERGY),
        skipTurns: 0,
      }));
      break;
    case "arcaneShield":
      updatePlayer(draft, playerId, () => ({ shielded: true }));
      break;
    case "ancientScroll":
      for (let draw = 0; draw < ANCIENT_SCROLL_DRAWS; draw++) drawCard(draft, playerId);
      break;
    case "luckyCharm":
      updatePlayer(draft, playerId, () => ({
        diceBoost: { kind: "bonus", amount: LUCKY_CHARM_BONUS, rolls: 1 },
      }));
      break;
    case "oracleEye":
      updatePlayer(draft, playerId, () => ({ diceBoost: { kind: "best" } }));
      break;
    case "ancestralAwakening":
      updatePlayer(draft, playerId, () => ({
        diceBoost: {
          kind: "bonus",
          amount: AWAKENING_BONUS,
          rolls: AWAKENING_ROLLS,
        },
      }));
      break;
    case "berserkFury":
      updatePlayer(draft, playerId, () => ({ diceBoost: { kind: "double" } }));
      break;
    case "fateRune":
      updatePlayer(draft, playerId, () => ({
        diceBoost: { kind: "fixed", value: value ?? 1 },
      }));
      break;
    case "mysticGate":
      if (portal === null) break;
      draft.events.push({
        type: "cardTeleported",
        playerId,
        from: position,
        to: portal,
      });
      resolveLanding(draft, playerId, portal);
      break;
    case "arcaneBlast": {
      if (targetId === null) break;
      const from = playerIn(draft, targetId).position;
      const path = pushPath(board, from, ARCANE_BLAST_PUSH);
      draft.events.push({
        type: "playerPushed",
        playerId: targetId,
        by: playerId,
        path,
      });
      updatePlayer(draft, targetId, () => ({ position: path.at(-1) ?? from }));
      break;
    }
    case "blindingFlash":
      if (targetId === null) break;
      draft.events.push({
        type: "skipTurnGained",
        playerId: targetId,
        tile: playerIn(draft, targetId).position,
      });
      updatePlayer(draft, targetId, (target) => ({
        skipTurns: target.skipTurns + 1,
      }));
      break;
  }
}

function validTarget(draft: Draft, playerId: PlayerId, targetId: PlayerId | undefined): PlayerId {
  if (!targetId || targetId === playerId || !draft.players.some((player) => player.id === targetId)) {
    throw new GameRuleError("INVALID_TARGET");
  }
  return targetId;
}

function validValue(value: number | undefined): number {
  if (value === undefined || !Number.isInteger(value) || value < 1 || value > DICE_SIDES) {
    throw new GameRuleError("INVALID_VALUE");
  }
  return value;
}

/** First portal on the main path strictly ahead of `position` (from a track: ahead of its portal), or null. */
export function nextPortalAhead(board: Board, position: TileId): TileId | null {
  const from = mainTileOf(board, position);
  const portal = board.tiles.find(
    (tile) => tile.id > from && tile.id <= board.finishTile && tile.effect.kind === "portal",
  );
  return portal?.id ?? null;
}
