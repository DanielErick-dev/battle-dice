import { CARD_CATALOG, cardCost, FLYING_NIMBUS_STEPS, KAMEHAMEHA_PUSH, MAX_KI, SENZU_KI } from "./cards";
import { GameRuleError } from "./commands";
import { playerIn, updatePlayer, walkPath, type Draft } from "./draft";
import { DICE_SIDES } from "./dice";
import { resolveLanding } from "./landing";
import type { CardInstance, PlayerId, TileId } from "./types";

export interface CardChoice {
  targetId?: PlayerId;
  value?: number;
}

/**
 * Validates and pays for a card (ki, one per turn), then applies its effect to the draft.
 * Movement cards resolve the tile they end on, like a roll would.
 */
export function playCard(draft: Draft, playerId: PlayerId, cardUid: string, choice: CardChoice): void {
  const { state } = draft;
  if (state.cardPlayedThisTurn) throw new GameRuleError("CARD_ALREADY_PLAYED");

  const player = playerIn(draft, playerId);
  const card = player.hand.find((candidate) => candidate.uid === cardUid);
  if (!card) throw new GameRuleError("UNKNOWN_CARD");
  if (player.ki < cardCost(card.cardId)) throw new GameRuleError("NOT_ENOUGH_KI");

  const definition = CARD_CATALOG[card.cardId];
  const targetId = definition.targetsOpponent ? validTarget(draft, playerId, choice.targetId) : null;
  const value = definition.needsValue ? validValue(choice.value) : null;
  const portal = card.cardId === "instantTransmission" ? nextPortal(draft, player.position) : null;

  updatePlayer(draft, playerId, (current) => ({
    ki: current.ki - cardCost(card.cardId),
    hand: current.hand.filter((candidate) => candidate.uid !== cardUid),
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
    case "flyingNimbus": {
      const path = walkPath(position, FLYING_NIMBUS_STEPS, board.finishTile);
      draft.events.push({ type: "playerMoved", playerId, path });
      resolveLanding(draft, playerId, path.at(-1) ?? position);
      break;
    }
    case "senzuBean":
      updatePlayer(draft, playerId, (player) => ({ ki: Math.min(MAX_KI, player.ki + SENZU_KI), skipTurns: 0 }));
      break;
    case "kiBarrier":
      updatePlayer(draft, playerId, () => ({ shielded: true }));
      break;
    case "kaioken":
      updatePlayer(draft, playerId, () => ({ diceBoost: { kind: "double" } }));
      break;
    case "dragonBall":
      updatePlayer(draft, playerId, () => ({ diceBoost: { kind: "fixed", value: value ?? 1 } }));
      break;
    case "instantTransmission":
      if (portal === null) break;
      draft.events.push({ type: "cardTeleported", playerId, from: position, to: portal });
      resolveLanding(draft, playerId, portal);
      break;
    case "kamehameha": {
      if (targetId === null) break;
      const from = playerIn(draft, targetId).position;
      const to = Math.max(board.startTile, from - KAMEHAMEHA_PUSH);
      const path = Array.from({ length: from - to }, (_, step) => from - step - 1);
      draft.events.push({ type: "playerPushed", playerId: targetId, by: playerId, path });
      updatePlayer(draft, targetId, () => ({ position: to }));
      break;
    }
    case "solarFlare":
      if (targetId === null) break;
      draft.events.push({ type: "skipTurnGained", playerId: targetId, tile: playerIn(draft, targetId).position });
      updatePlayer(draft, targetId, (target) => ({ skipTurns: target.skipTurns + 1 }));
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

/** First portal strictly ahead of `position`. */
function nextPortal(draft: Draft, position: TileId): TileId {
  const portal = draft.state.board.tiles.find((tile) => tile.id > position && tile.effect.kind === "portal");
  if (!portal) throw new GameRuleError("NO_PORTAL_AHEAD");
  return portal.id;
}
