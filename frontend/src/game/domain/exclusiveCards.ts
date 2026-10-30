import { chargeAbility, isAbilityReady, VOID_CAPACITY } from "./abilities";
import { getTile } from "./board";
import { CARD_CATALOG, type CardId } from "./cards";
import type { GameErrorCode } from "./commands";
import { throwOnPile } from "./deck";
import { playerIn, pushPath, updatePlayer, walkPath, type Draft } from "./draft";
import { isFrozen } from "./fairy";
import { resolveLanding } from "./landing";
import { senseHiddenTraps } from "./verdict";
import { devour } from "./void";
import type { Board, GameState, Player, PlayerId, Threat, TileId } from "./types";

/** Themis's Sword of Law: tiles back, or more when the one struck is ahead of her. */
export const SWORD_PUSH = 4;
export const SWORD_PUSH_AHEAD = 8;
/** Random cards the Weight of Guilt makes an opponent drop. */
export const GUILT_DISCARDS = 2;
/** Tiles ahead the Sacred Blindfold feels for hidden traps. */
export const BLINDFOLD_RANGE = 12;
/** Charge the Void Hunger feeds Zarek's Void. */
export const VOID_HUNGER_CHARGE = 2;
/** Tiles ahead the Hungry Rift reaches for a harm. */
export const HUNGRY_RIFT_RANGE = 15;

/** What a card's blockers look at beyond the player: the board and what covers or has emptied its tiles. */
export type HarmTable = Pick<
  GameState,
  "board" | "blackFlames" | "winter" | "destroyedTraps" | "pinnedTraps" | "enchantedTiles"
>;

/** A character's own card in someone else's hand (stolen) is dead; some need something more. */
export function exclusiveBlocker(table: HarmTable, player: Player, cardId: CardId): GameErrorCode | null {
  const { exclusive } = CARD_CATALOG[cardId];
  if (!exclusive) return null;
  if (player.ability !== exclusive) return "NOT_YOUR_CARD";
  switch (cardId) {
    case "voidHunger":
      return isAbilityReady(player) ? "ABILITY_ALREADY_READY" : null;
    case "hungryRift":
      if (player.voidHold.length >= VOID_CAPACITY) return "VOID_FULL";
      return harmAhead(table, player) ? null : "NO_HARM_AHEAD";
    case "voidEcho":
      if (player.voidHold.length === 0) return "VOID_EMPTY";
      return player.voidHold.length >= VOID_CAPACITY ? "VOID_FULL" : null;
    default:
      return null;
  }
}

/** The first harm in sight within HUNGRY_RIFT_RANGE ahead: hidden traps stay secret, spent or covered ones are gone. */
export function harmAhead(table: HarmTable, player: Player): { tile: TileId; threat: Threat } | null {
  const { board } = table;
  for (const tile of walkPath(board, player.position, HUNGRY_RIFT_RANGE, player.realmEntry)) {
    const threat = visibleHarm(table, tile);
    if (threat) return { tile, threat };
  }
  return null;
}

function visibleHarm(table: HarmTable, tile: TileId): Threat | null {
  const covered =
    table.destroyedTraps.includes(tile) ||
    table.pinnedTraps.includes(tile) ||
    table.enchantedTiles.some((enchanted) => enchanted.tile === tile) ||
    table.blackFlames.some((flame) => flame.tile === tile) ||
    isFrozen(table.winter, table.board.startTile, tile);
  if (covered) return null;
  const { kind } = getTile(table.board, tile).effect;
  return kind === "trap" || kind === "curse" || kind === "skipTurn" ? kind : null;
}

/** The nearest rift of `owner`'s behind `target`, where the Rift Call drags them. */
export function riftBehind(board: Board, target: Player, owner: PlayerId): TileId | null {
  const behind = pushPath(board, target.position, board.tiles.length, target.realmEntry);
  return behind.find((tile) => getTile(board, tile).rift?.owner === owner) ?? null;
}

/** Same space ahead along the way forward (rifts included, so tile ids can't be compared). */
function isAhead(board: Board, from: Player, to: Player): boolean {
  return walkPath(board, from.position, board.tiles.length, from.realmEntry).includes(to.position);
}

/** The characters' own cards, after cardPlay has paid for them and handled wards and the Silent Verdict. */
export function playExclusive(draft: Draft, playerId: PlayerId, cardId: CardId, targetId: PlayerId | null): void {
  const { board } = draft.state;
  const player = playerIn(draft, playerId);

  switch (cardId) {
    case "scalesOfJustice": {
      if (targetId === null) return;
      // Weighed together and split evenly; an odd one left over falls to whoever played it.
      const total = player.energy + playerIn(draft, targetId).energy;
      const energy = Math.ceil(total / 2);
      const targetEnergy = total - energy;
      updatePlayer(draft, playerId, () => ({ energy }));
      updatePlayer(draft, targetId, () => ({ energy: targetEnergy }));
      draft.events.push({ type: "energyWeighed", playerId, targetId, energy, targetEnergy });
      return;
    }
    case "swordOfLaw": {
      if (targetId === null) return;
      const target = playerIn(draft, targetId);
      const steps = isAhead(board, player, target) ? SWORD_PUSH_AHEAD : SWORD_PUSH;
      const path = pushPath(board, target.position, steps, target.realmEntry);
      draft.events.push({ type: "playerPushed", playerId: targetId, by: playerId, path });
      updatePlayer(draft, targetId, () => ({ position: path.at(-1) ?? target.position }));
      return;
    }
    case "weightOfGuilt":
      if (targetId === null) return;
      for (let dropped = 0; dropped < GUILT_DISCARDS; dropped++) discardRandom(draft, targetId);
      return;
    case "sacredBlindfold":
      senseHiddenTraps(draft, playerId, walkPath(board, player.position, BLINDFOLD_RANGE, player.realmEntry));
      return;
    case "voidHunger":
      feedVoid(draft, playerId);
      return;
    case "hungryRift": {
      const harm = harmAhead(harmTable(draft), player);
      if (harm) devour(draft, playerId, harm.tile, harm.threat);
      return;
    }
    case "voidEcho": {
      const item = player.voidHold.at(-1);
      if (!item) return;
      updatePlayer(draft, playerId, (current) => ({ voidIdle: 0, voidHold: [...current.voidHold, item] }));
      draft.events.push({ type: "voidEchoed", playerId, item });
      return;
    }
    case "riftCall": {
      if (targetId === null) return;
      const target = playerIn(draft, targetId);
      const rift = riftBehind(board, target, playerId);
      if (rift === null) return;
      draft.events.push({ type: "cardTeleported", playerId: targetId, from: target.position, to: rift });
      updatePlayer(draft, targetId, () => ({ realmEntry: null }));
      resolveLanding(draft, targetId, rift);
      return;
    }
  }
}

function harmTable(draft: Draft): HarmTable {
  return {
    board: draft.state.board,
    blackFlames: draft.blackFlames,
    winter: draft.winter,
    destroyedTraps: draft.destroyedTraps,
    pinnedTraps: draft.pinnedTraps,
    enchantedTiles: draft.enchantedTiles,
  };
}

function feedVoid(draft: Draft, playerId: PlayerId): void {
  const before = playerIn(draft, playerId);
  let player = before;
  let becameReady = false;
  for (let meal = 0; meal < VOID_HUNGER_CHARGE; meal++) {
    const charged = chargeAbility(player, { fromBoard: true });
    player = charged.player;
    becameReady ||= charged.becameReady;
  }
  const charge = player.abilityCharge - before.abilityCharge;
  if (charge === 0) return;
  updatePlayer(draft, playerId, () => ({ abilityCharge: player.abilityCharge }));
  draft.events.push({ type: "voidFed", playerId, charge });
  if (becameReady) draft.events.push({ type: "abilityReady", playerId, ability: "theVoid" });
}

function discardRandom(draft: Draft, playerId: PlayerId): void {
  const { hand } = playerIn(draft, playerId);
  if (hand.length === 0) return;
  const card = hand[Math.floor(draft.random() * hand.length)];
  const rest = hand.filter((candidate) => candidate.uid !== card.uid);
  updatePlayer(draft, playerId, (player) => ({ hand: rest, discard: throwOnPile(player.discard, [card]) }));
  draft.events.push({ type: "cardDiscarded", playerId, card, hand: rest });
}
