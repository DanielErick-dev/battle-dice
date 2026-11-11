import { CARD_CATALOG, cardCost, type CardId } from "./catalog";
import { cardsPerTurn } from "../abilities/basic";
import { GameRuleError } from "../core/errors";
import { aimWard } from "../core/playerStatus";
import { judgeAim } from "../characters/themis/verdict";
import { playerIn, updatePlayer, type Draft } from "../core/draft";
import { throwOnPile } from "./decks";
import type { DiceRoller } from "../core/dice";
import { cardBlocker, nextPortalAhead } from "./blocker";
import { validSacrifices, validTarget, validValue, type CardChoice } from "./choice";
import { applyCardEffect } from "./effects";
import type { PlayerId } from "../core/state";

/** Turned back by Themis's Silent Verdict, these do nothing to whoever aimed them. */
const VERDICT_UNDOES: readonly CardId[] = ["fateSwap", "riftCall"];

/** Movement cards resolve the tile they end on, like a roll would. */
export function playCard(
  draft: Draft,
  playerId: PlayerId,
  cardUid: string,
  choice: CardChoice,
  rollDie: DiceRoller,
): void {
  const { cardsPlayedThisTurn, abilityInUse } = draft.state;
  const player = playerIn(draft, playerId);
  if (cardsPlayedThisTurn >= cardsPerTurn(abilityInUse)) throw new GameRuleError("CARD_ALREADY_PLAYED");

  const card = player.hand.find((candidate) => candidate.uid === cardUid);
  if (!card) throw new GameRuleError("UNKNOWN_CARD");
  const blocker = cardBlocker(draft.state, player, card.cardId);
  if (blocker) throw new GameRuleError(blocker);

  const definition = CARD_CATALOG[card.cardId];
  const targetId = definition.targetsOpponent ? validTarget(draft, playerId, card.cardId, choice.targetId) : null;
  const value = definition.needsValue ? validValue(choice.value) : null;
  const portal = card.cardId === "mysticGate" ? nextPortalAhead(draft.state, player.position, player.realmEntry) : null;
  const sacrificed = validSacrifices(player.hand, card, choice.sacrificeUids);
  const spent = new Set([cardUid, ...sacrificed.map((burnt) => burnt.uid)]);

  updatePlayer(draft, playerId, (current) => ({
    energy: current.energy - cardCost(card.cardId),
    hand: current.hand.filter((candidate) => !spent.has(candidate.uid)),
    discard: throwOnPile(current.discard, [card, ...sacrificed]),
  }));
  draft.events.push({ type: "cardPlayed", playerId, card, targetId, value });
  for (const burnt of sacrificed) {
    draft.events.push({ type: "cardDiscarded", playerId, card: burnt, hand: playerIn(draft, playerId).hand });
  }
  const target = targetId === null || definition.spares ? null : playerIn(draft, targetId);
  // A marked attacker's next attack goes before Themis instead, and comes back on them twice as hard.
  const judgeId = target && judgeAim(draft, playerId, target.id, { cardId: card.cardId });
  if (judgeId) {
    // A swap has no side to turn, and Zarek's rifts never harm him: those are only undone.
    if (!VERDICT_UNDOES.includes(card.cardId))
      applyCardEffect(draft, judgeId, card, { targetId: playerId, value, portal, rollDie, doubled: true });
    return;
  }
  // Thrown at a protected opponent, the card is spent for nothing.
  const ward = target && aimWard(target);
  if (target && ward) {
    draft.events.push({ type: "cardBlocked", playerId, targetId: target.id, cardId: card.cardId, ward });
    return;
  }
  applyCardEffect(draft, playerId, card, { targetId, value, portal, rollDie });
}
