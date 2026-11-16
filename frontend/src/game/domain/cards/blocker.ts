import { CARD_CATALOG, cardCost, type CardId } from "./catalog";
import { MAX_ENERGY } from "../core/energy";
import { isAbilityReady } from "../abilities/charge";
import type { GameErrorCode } from "../core/errors";
import { mainTileOf } from "../board/board";
import { isFrozen } from "../characters/fairy/winter";
import { exclusiveBlocker, type HarmTable } from "./exclusive";
import { isBlackedOut } from "../characters/alva/systems";
import type { RealmEntry, TileId } from "../board/types";
import type { Player } from "../core/state";

/** What a card's blockers look at beyond the player: the board and what covers or has emptied its tiles. */
export type CardTable = HarmTable;

/** Blockers from the player's own state, shared with the UI; turn rules (cards per turn) are checked on play. */
export function cardBlocker(table: CardTable, player: Player, cardId: CardId): GameErrorCode | null {
  const { board } = table;
  if (player.silencedTurns > 0) return "SILENCED";
  if (isBlackedOut(player)) return "BLACKED_OUT";
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
  if (player.hand.length <= (CARD_CATALOG[cardId].sacrifices ?? 0)) return "NO_SACRIFICE";
  return exclusiveBlocker(table, player, cardId);
}

/**
 * First main-path portal strictly ahead (from a track: ahead of the portal of `entry`). One under
 * black fire, snow or ice isn't a portal while it lasts, so it's passed by.
 */
export function nextPortalAhead(
  {
    board,
    blackFlames,
    scarletFlames,
    winter,
    enchantedTiles,
  }: Pick<CardTable, "board" | "blackFlames" | "scarletFlames" | "winter" | "enchantedTiles">,
  position: TileId,
  entry?: RealmEntry | null,
): TileId | null {
  const from = mainTileOf(board, position, entry);
  const gone = (tile: TileId) =>
    blackFlames.some((flame) => flame.tile === tile) ||
    scarletFlames.some((flame) => flame.tile === tile) ||
    enchantedTiles.some((enchanted) => enchanted.tile === tile) ||
    isFrozen(winter, board.startTile, tile);
  const portal = board.tiles.find(
    (tile) => tile.id > from && tile.id <= board.finishTile && tile.effect.kind === "portal" && !gone(tile.id),
  );
  return portal?.id ?? null;
}
