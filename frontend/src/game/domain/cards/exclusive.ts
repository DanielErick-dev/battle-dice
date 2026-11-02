import { chargeAbility, isAbilityReady } from "../abilities/charge";
import { VOID_CAPACITY, devour } from "../characters/zarek/void";
import { getTile } from "../board/board";
import type { DiceRoller } from "../core/dice";
import { CARD_CATALOG, type CardId } from "./catalog";
import type { GameErrorCode } from "../core/errors";
import { playerIn, updatePlayer, type Draft } from "../core/draft";
import { pushPath, walkPath } from "../board/paths";
import { isFrozen } from "../characters/fairy/winter";
import { resolveLanding } from "../board/landing";
import { blindJustice, confiscate, finalJudgment, issueDecree, markEveryone } from "../characters/themis/cards";
import type { Board, Threat, TileId } from "../board/types";
import type { GameState, Player, PlayerId } from "../core/state";

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

/** The characters' own cards, after cardPlay has paid for them and handled wards and the Silent Verdict. */
export function playExclusive(
  draft: Draft,
  playerId: PlayerId,
  cardId: CardId,
  targetId: PlayerId | null,
  rollDie: DiceRoller,
): void {
  const player = playerIn(draft, playerId);

  switch (cardId) {
    case "blindJustice":
      blindJustice(draft, playerId);
      return;
    case "confiscation":
      if (targetId !== null) confiscate(draft, playerId, targetId);
      return;
    case "justiceMark":
      markEveryone(draft, playerId);
      return;
    case "containmentDecree":
      issueDecree(draft, playerId);
      return;
    case "finalJudgment":
      if (targetId !== null) finalJudgment(draft, playerId, targetId, rollDie);
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
      const rift = riftBehind(draft.state.board, target, playerId);
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
