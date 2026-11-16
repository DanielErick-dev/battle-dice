import { throwOnPile } from "../../cards/decks";
import { feedCondenser } from "../alchemist/condenser";
import { GameRuleError } from "../../core/errors";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { isUntouchable } from "../../core/playerStatus";
import { shuffle } from "../../core/random";
import type { CardInstance, Player, PlayerId } from "../../core/state";

/** Opponents' own turns without cards or abilities, then with moving cards halved. */
export const BLACKOUT_TURNS = 2;
export const BROWNOUT_TURNS = 1;
/** Her own turns between Memory Overloads; it burns OVERLOAD_BURN real cards from hands above OVERLOAD_HAND. */
export const OVERLOAD_ROUNDS = 3;
export const OVERLOAD_HAND = 5;
export const OVERLOAD_BURN = 5;

export function isAlva(player: Player): boolean {
  return player.ability === "empPulse";
}

/** Corrupted Cards count as cards in hand for everything of hers. */
export function handWeight(player: Player): number {
  return player.hand.length + player.corrupted;
}

export function isOverloaded(player: Player): boolean {
  return handWeight(player) > OVERLOAD_HAND;
}

/** `player.emp` counts down as their turns start: above BROWNOUT_TURNS it's the blackout, then the brownout. */
export function isBlackedOut(player: Player): boolean {
  return player.emp > BROWNOUT_TURNS;
}

export function inBrownout(player: Player): boolean {
  return player.emp > 0 && player.emp <= BROWNOUT_TURNS;
}

/** A moving card's number under the Brownout: halved, rounded down. */
export function sapMovement(draft: Draft, playerId: PlayerId, amount: number): number {
  if (!inBrownout(playerIn(draft, playerId))) return amount;
  const sapped = Math.floor(amount / 2);
  draft.events.push({ type: "brownoutSapped", playerId, from: amount, to: sapped });
  return sapped;
}

/** The EMP: every opponent in reach of it (not protected) loses cards and abilities, and her charge waits it out. */
export function empPulse(draft: Draft, playerId: PlayerId): void {
  const victims = draft.players.filter((player) => player.id !== playerId && !isUntouchable(player));
  // Counted down as their turns start, so the next BLACKOUT_TURNS of theirs are dark whoever plays next.
  const emp = BLACKOUT_TURNS + BROWNOUT_TURNS + 1;
  for (const victim of victims) updatePlayer(draft, victim.id, (player) => ({ emp: Math.max(player.emp, emp) }));
  // Her 5 rounds of charge only start once the whole EMP is over.
  updatePlayer(draft, playerId, () => ({ chargeHeld: BLACKOUT_TURNS + BROWNOUT_TURNS }));
  draft.events.push({ type: "empPulsed", playerId, victims: victims.map((victim) => victim.id) });
}

/** One more of her turns starting: every OVERLOAD_ROUNDS of them the Memory Overload goes off. */
export function tickOverload(draft: Draft, playerId: PlayerId): void {
  const alva = playerIn(draft, playerId);
  if (!isAlva(alva)) return;
  const overload = alva.alva.overload + 1;
  const fires = overload >= OVERLOAD_ROUNDS;
  updatePlayer(draft, playerId, () => ({ alva: { overload: fires ? 0 : overload } }));
  if (fires) memoryOverload(draft, playerId);
}

/** Burns OVERLOAD_BURN real cards from each overloaded opponent (never a Corrupted one); returns how many burnt. */
export function memoryOverload(draft: Draft, playerId: PlayerId): number {
  const burnt: { playerId: PlayerId; cards: CardInstance[] }[] = [];
  for (const victim of draft.players) {
    if (victim.id === playerId || isUntouchable(victim) || !isOverloaded(victim)) continue;
    const cards = shuffle(victim.hand, draft.random).slice(0, OVERLOAD_BURN);
    if (cards.length === 0) continue;
    const gone = new Set(cards.map((card) => card.uid));
    updatePlayer(draft, victim.id, (player) => ({
      hand: player.hand.filter((card) => !gone.has(card.uid)),
      discard: throwOnPile(player.discard, cards),
    }));
    burnt.push({ playerId: victim.id, cards });
  }
  draft.events.push({ type: "memoryOverload", playerId, burnt });
  const total = burnt.reduce((sum, entry) => sum + entry.cards.length, 0);
  feedCondenser(draft, total);
  return total;
}

/** Corrupted Cards sit in the hand past its limit and let her see it; they never reach a deck or a graveyard. */
export function injectCorrupted(draft: Draft, playerId: PlayerId, targetId: PlayerId, count: number): void {
  updatePlayer(draft, targetId, (player) => ({ corrupted: player.corrupted + count }));
  draft.events.push({ type: "corruptedInjected", playerId, targetId, count });
}

/** Deleting one Corrupted Card takes a real card along with it, and a hand free to play cards. */
export function purgeCorrupted(draft: Draft, playerId: PlayerId, cardUid: string): void {
  const player = playerIn(draft, playerId);
  if (player.corrupted === 0) throw new GameRuleError("NO_CORRUPTED");
  if (player.silencedTurns > 0) throw new GameRuleError("SILENCED");
  if (isBlackedOut(player)) throw new GameRuleError("BLACKED_OUT");
  const card = player.hand.find((held) => held.uid === cardUid);
  if (!card) throw new GameRuleError("UNKNOWN_CARD");
  updatePlayer(draft, playerId, (current) => ({
    corrupted: current.corrupted - 1,
    hand: current.hand.filter((held) => held.uid !== cardUid),
    discard: throwOnPile(current.discard, [card]),
  }));
  draft.events.push({ type: "corruptedPurged", playerId, card });
  feedCondenser(draft, 1);
}

/** An Alva sees the hand of anyone carrying her spyware. */
export function spiesOn(viewer: Player | undefined, player: Player): boolean {
  return viewer !== undefined && isAlva(viewer) && viewer.id !== player.id && player.corrupted > 0;
}
