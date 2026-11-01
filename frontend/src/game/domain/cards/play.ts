import { CARD_CATALOG, cardCost, type CardId } from "./catalog";
import { MAX_ENERGY } from "../core/energy";
import { abilityCycle, isAbilityReady } from "../abilities/charge";
import { cardsPerTurn } from "../abilities/basic";
import { unpinPassed } from "../characters/archer/arrowRain";
import { GameRuleError, type GameErrorCode } from "../core/errors";
import { mainTileOf } from "../board/board";
import { opponentsInSpace } from "../board/reach";
import { aimWard } from "../core/playerStatus";
import { passVerdict, senseHiddenTraps, verdictArmed } from "../characters/themis/verdict";
import { drawCard } from "./hand";
import { playerIn, updatePlayer, type Draft } from "../core/draft";
import { pushPath, walkPath } from "../board/paths";
import { throwOnPile } from "./decks";
import { DICE_SIDES } from "../core/dice";
import { resolveLanding } from "../board/landing";
import { crossSpecters } from "../characters/warden/specters";
import { dragIntoHell, dragTargets } from "../characters/seraphiel/seraph";
import { walkTrampling } from "../characters/bjorn/untamed";
import {
  FUSED_AEGIS_TURNS,
  FUSED_BLAST_PUSH,
  FUSED_LUCKY_BONUS,
  FUSED_SCROLL_DRAWS,
  FUSED_SHIELD_ARMOUR,
  FUSED_WIND_STEP_TILES,
} from "./fusion";
import { isFrozen } from "../characters/fairy/winter";
import { exclusiveBlocker, playExclusive, riftBehind, type HarmTable } from "./exclusive";
import type { Board, RealmEntry, TileId } from "../board/types";
import type { CardInstance, Player, PlayerId } from "../core/state";

export const ARCANE_BLAST_PUSH = 7;
export const HEALING_HERB_ENERGY = 6;
export const ANCIENT_SCROLL_DRAWS = 2;
export const LUCKY_CHARM_BONUS = 2;
/** Own turns, counting the one it's played in. */
export const AEGIS_TURNS = 3;
export const AWAKENING_BONUS = 3;
export const AWAKENING_ROLLS = 2;
export const WIND_STEP_TILES = 3;

export interface CardChoice {
  targetId?: PlayerId;
  value?: number;
}

/** What a card's blockers look at beyond the player: the board and what covers or has emptied its tiles. */
export type CardTable = HarmTable;

/** Blockers from the player's own state, shared with the UI; turn rules (cards per turn) are checked on play. */
export function cardBlocker(table: CardTable, player: Player, cardId: CardId): GameErrorCode | null {
  const { board } = table;
  if (player.silencedTurns > 0) return "SILENCED";
  if (player.energy < cardCost(cardId)) return "NOT_ENOUGH_ENERGY";
  if (cardId === "arcaneShield" && player.shielded) return "ALREADY_SHIELDED";
  const { dice } = CARD_CATALOG[cardId];
  // Bonuses add up (combos); only the way the dice are thrown can't be changed twice.
  if (dice === "throw" && player.diceBoost !== null) return "DICE_BOOST_ACTIVE";
  if (cardId === "mysticGate" && nextPortalAhead(table, player.position, player.realmEntry) === null) {
    return "NO_PORTAL_AHEAD";
  }
  if (cardId === "celestialLight" && player.energy >= MAX_ENERGY) return "ENERGY_FULL";
  if (cardId === "ascension" && (player.ability === null || isAbilityReady(player))) return "ABILITY_ALREADY_READY";
  if (cardId === "abyssCall" && !board.tracks.some((track) => track.realm === "infernal")) return "NO_HELL";
  return exclusiveBlocker(table, player, cardId);
}

/** Turned back by Themis's Silent Verdict, these do nothing to whoever aimed them. */
const VERDICT_UNDOES: readonly CardId[] = ["fateSwap", "riftCall"];

/** Movement cards resolve the tile they end on, like a roll would. */
export function playCard(draft: Draft, playerId: PlayerId, cardUid: string, choice: CardChoice): void {
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

  updatePlayer(draft, playerId, (current) => ({
    energy: current.energy - cardCost(card.cardId),
    hand: current.hand.filter((candidate) => candidate.uid !== cardUid),
    discard: throwOnPile(current.discard, [card]),
  }));
  draft.events.push({ type: "cardPlayed", playerId, card, targetId, value });
  const target = targetId === null ? null : playerIn(draft, targetId);
  // Thrown at a protected opponent, the card is spent for nothing.
  const ward = target && aimWard(target);
  if (target && ward) {
    draft.events.push({ type: "cardBlocked", playerId, targetId: target.id, cardId: card.cardId, ward });
    return;
  }
  if (target && verdictArmed(target)) {
    passVerdict(draft, target.id, playerId, { cardId: card.cardId });
    // A swap has no side to turn, and Zarek's rifts never harm him: those are only undone.
    if (!VERDICT_UNDOES.includes(card.cardId))
      applyEffect(draft, target.id, card, { targetId: playerId, value, portal });
    return;
  }
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
      // Under Cronos's reversed time the wind blows them back the way they came, like their rolls.
      const { reversedRolls, realmEntry } = playerIn(draft, playerId);
      const windTiles = card.fused ? FUSED_WIND_STEP_TILES : WIND_STEP_TILES;
      const reversed = reversedRolls > 0;
      const path = reversed
        ? pushPath(board, position, windTiles, realmEntry)
        : walkPath(board, position, windTiles, realmEntry);
      if (reversed) draft.events.push({ type: "playerMoved", playerId, path });
      else walkTrampling(draft, playerId, path);
      crossSpecters(draft, playerId, path);
      senseHiddenTraps(draft, playerId, path);
      resolveLanding(draft, playerId, path.at(-1) ?? position);
      unpinPassed(draft, path);
      break;
    }
    case "abyssCall":
      if (targetId !== null) dragIntoHell(draft, playerId, targetId);
      break;
    case "healingHerb":
      updatePlayer(draft, playerId, (player) => ({
        // Fused, it fills the energy right up.
        energy: card.fused ? MAX_ENERGY : Math.min(MAX_ENERGY, player.energy + HEALING_HERB_ENERGY),
        skipTurns: 0,
        snowbound: null,
        chained: 0,
      }));
      break;
    case "arcaneShield":
      updatePlayer(draft, playerId, () => ({ shielded: true }));
      // Fused, Spectral Armour comes with the shield.
      if (card.fused) {
        updatePlayer(draft, playerId, (player) => ({
          spectralArmour: Math.max(player.spectralArmour, FUSED_SHIELD_ARMOUR),
        }));
        draft.events.push({ type: "armourRaised", playerId, turns: FUSED_SHIELD_ARMOUR });
      }
      break;
    case "ancientScroll":
      for (let draw = 0; draw < (card.fused ? FUSED_SCROLL_DRAWS : ANCIENT_SCROLL_DRAWS); draw++) {
        drawCard(draft, playerId);
      }
      break;
    case "luckyCharm":
      updatePlayer(draft, playerId, (player) => ({
        diceBonuses: [
          ...player.diceBonuses,
          {
            amount: card.fused ? FUSED_LUCKY_BONUS : LUCKY_CHARM_BONUS,
            rolls: 1,
          },
        ],
      }));
      break;
    case "oracleEye":
      updatePlayer(draft, playerId, () => ({ diceBoost: { kind: "best" } }));
      break;
    case "ancestralAwakening":
      updatePlayer(draft, playerId, (player) => ({
        diceBonuses: [...player.diceBonuses, { amount: AWAKENING_BONUS, rolls: AWAKENING_ROLLS }],
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
      const { position: from, realmEntry } = playerIn(draft, targetId);
      const path = pushPath(board, from, card.fused ? FUSED_BLAST_PUSH : ARCANE_BLAST_PUSH, realmEntry);
      draft.events.push({
        type: "playerPushed",
        playerId: targetId,
        by: playerId,
        path,
      });
      updatePlayer(draft, targetId, () => ({ position: path.at(-1) ?? from }));
      break;
    }
    case "fateSwap": {
      // The player and the target trade places; neither tile does anything on arrival.
      if (targetId === null) break;
      const theirs = playerIn(draft, targetId).position;
      draft.events.push(
        { type: "cardTeleported", playerId, from: position, to: theirs },
        { type: "cardTeleported", playerId: targetId, from: theirs, to: position },
      );
      updatePlayer(draft, playerId, () => ({ position: theirs }));
      updatePlayer(draft, targetId, () => ({ position }));
      break;
    }
    case "celestialLight":
      updatePlayer(draft, playerId, () => ({ energy: MAX_ENERGY }));
      // Fused (Divine Dawn): the ability ready too, and free of lost turns and snow.
      if (card.fused) {
        updatePlayer(draft, playerId, () => ({
          skipTurns: 0,
          snowbound: null,
        }));
        readyAbility(draft, playerId);
      }
      break;
    case "heavenlyAegis": {
      // Fused (Celestial Sanctuary): twice as long, with the Arcane Shield.
      const turns = card.fused ? FUSED_AEGIS_TURNS : AEGIS_TURNS;
      updatePlayer(draft, playerId, () => ({
        spectralArmour: turns,
        divineAegis: turns,
        ...(card.fused && { shielded: true }),
      }));
      draft.events.push({ type: "armourRaised", playerId, turns });
      break;
    }
    case "ascension":
      readyAbility(draft, playerId);
      // Fused (Apotheosis): another turn once this one is over.
      if (card.fused) draft.extraTurn = true;
      break;
    default:
      playExclusive(draft, playerId, card.cardId, targetId);
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

/** Anyone in the same place, protected or not; the Call of the Abyss only reaches the main path (see dragTargets). */
export function cardTargets(board: Board, players: readonly Player[], playerId: PlayerId, cardId: CardId): Player[] {
  const inSpace = opponentsInSpace(board, players, playerId);
  // Only those with one of the player's rifts somewhere behind them can be called back to it.
  if (cardId === "riftCall") return inSpace.filter((player) => riftBehind(board, player, playerId) !== null);
  if (cardId !== "abyssCall") return inSpace;
  const draggable = new Set(dragTargets(board, players, playerId).map((player) => player.id));
  return inSpace.filter((player) => draggable.has(player.id));
}

function validTarget(draft: Draft, playerId: PlayerId, cardId: CardId, targetId: PlayerId | undefined): PlayerId {
  const target = cardTargets(draft.state.board, draft.players, playerId, cardId).find(
    (player) => player.id === targetId,
  );
  if (!target) throw new GameRuleError("INVALID_TARGET");
  return target.id;
}

function validValue(value: number | undefined): number {
  if (value === undefined || !Number.isInteger(value) || value < 1 || value > DICE_SIDES) {
    throw new GameRuleError("INVALID_VALUE");
  }
  return value;
}

/**
 * First main-path portal strictly ahead (from a track: ahead of the portal of `entry`). One under
 * black fire or ice isn't a portal while it lasts, so it's passed by.
 */
export function nextPortalAhead(
  { board, blackFlames, winter }: Pick<CardTable, "board" | "blackFlames" | "winter">,
  position: TileId,
  entry?: RealmEntry | null,
): TileId | null {
  const from = mainTileOf(board, position, entry);
  const gone = (tile: TileId) =>
    blackFlames.some((flame) => flame.tile === tile) || isFrozen(winter, board.startTile, tile);
  const portal = board.tiles.find(
    (tile) => tile.id > from && tile.id <= board.finishTile && tile.effect.kind === "portal" && !gone(tile.id),
  );
  return portal?.id ?? null;
}

/** Ascension and the Divine Dawn. */
function readyAbility(draft: Draft, playerId: PlayerId): void {
  const { ability } = playerIn(draft, playerId);
  if (ability === null) return;
  updatePlayer(draft, playerId, () => ({
    abilityCharge: abilityCycle(ability),
  }));
  draft.events.push({ type: "abilityReady", playerId, ability });
}
