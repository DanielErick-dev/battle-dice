import { pushPath } from "../../board/paths";
import type { GameErrorCode } from "../../core/errors";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { isUntouchable } from "../../core/playerStatus";
import { advance } from "../themis/cards";
import type { CardId } from "../../cards/catalog";
import type { Player, PlayerId } from "../../core/state";
import { handWeight, injectCorrupted, isOverloaded, memoryOverload } from "./systems";

/** Corrupted Cards the Malware Injection puts in one hand, and the Apocalypse in every opponent's. */
export const MALWARE_CARDS = 2;
/** Tiles the Overload Thruster flies per overloaded opponent. */
export const THRUST_PER_OVERLOADED = 5;
/** Own turns the Firewall Lock keeps the target's cards locked. */
export const FIREWALL_TURNS = 2;
/** Tiles back per card in the target's hand (Data Collapse), tiles ahead per card burnt (Apocalypse). */
export const COLLAPSE_PER_CARD = 2;
export const HARVEST_PER_CARD = 2;

export function alvaBlocker(players: readonly Player[], player: Player, cardId: CardId): GameErrorCode | null {
  if (cardId !== "overloadThruster") return null;
  return players.some((other) => other.id !== player.id && isOverloaded(other)) ? null : "NO_OVERLOADED_OPPONENT";
}

export function malwareInjection(draft: Draft, playerId: PlayerId, targetId: PlayerId): void {
  injectCorrupted(draft, playerId, targetId, MALWARE_CARDS);
}

export function overloadThruster(draft: Draft, playerId: PlayerId): void {
  const overloaded = draft.players.filter((player) => player.id !== playerId && isOverloaded(player)).length;
  thrust(draft, playerId, overloaded * THRUST_PER_OVERLOADED);
}

export function firewallLock(draft: Draft, playerId: PlayerId, targetId: PlayerId): void {
  // Silence counts down as their turns start, so one more covers FIREWALL_TURNS whole turns of theirs.
  updatePlayer(draft, targetId, (player) => ({ silencedTurns: Math.max(player.silencedTurns, FIREWALL_TURNS + 1) }));
  draft.events.push({ type: "firewallLocked", playerId, targetId, turns: FIREWALL_TURNS });
}

export function dataCollapse(draft: Draft, playerId: PlayerId, targetId: PlayerId): void {
  const target = playerIn(draft, targetId);
  const weight = handWeight(target);
  draft.events.push({ type: "dataCollapsed", playerId, targetId, weight });
  if (weight === 0) return;
  const path = pushPath(draft.state.board, target.position, weight * COLLAPSE_PER_CARD, target.realmEntry);
  draft.events.push({ type: "playerPushed", playerId: targetId, by: playerId, path });
  updatePlayer(draft, targetId, () => ({ position: path.at(-1) ?? target.position }));
}

/** Apocalypse Protocol: spyware in every hand, the Overload set off at once, and a flight on what it burnt. */
export function apocalypseProtocol(draft: Draft, playerId: PlayerId): void {
  draft.events.push({ type: "apocalypseProtocol", playerId });
  for (const opponent of draft.players.filter((player) => player.id !== playerId && !isUntouchable(player))) {
    injectCorrupted(draft, playerId, opponent.id, MALWARE_CARDS);
  }
  thrust(draft, playerId, memoryOverload(draft, playerId) * HARVEST_PER_CARD);
}

function thrust(draft: Draft, playerId: PlayerId, tiles: number): void {
  draft.events.push({ type: "alvaThrust", playerId, tiles });
  if (tiles > 0) advance(draft, playerId, tiles);
}
