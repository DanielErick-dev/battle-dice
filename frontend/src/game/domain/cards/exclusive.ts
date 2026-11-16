import { chargeAbility, isAbilityReady } from "../abilities/charge";
import { VOID_CAPACITY, devour } from "../characters/zarek/void";
import { voidApex } from "../characters/zarek/apex";
import { getTile } from "../board/board";
import type { DiceRoller } from "../core/dice";
import { CARD_CATALOG, type CardId } from "./catalog";
import type { GameErrorCode } from "../core/errors";
import { playerIn, updatePlayer, type Draft } from "../core/draft";
import { pushPath, walkPath } from "../board/paths";
import { isFrozen } from "../characters/fairy/winter";
import { resolveLanding } from "../board/landing";
import { blindJustice, confiscate, finalJudgment, issueDecree, markEveryone } from "../characters/themis/cards";
import {
  emberStep,
  hotBlood,
  pureFuel,
  scarletFever,
  scarletSupernova,
  supernovaFuel,
} from "../characters/akane/cards";
import type { Board, Threat, TileId } from "../board/types";
import {
  convergeAll,
  exchangeElement,
  exchangeSource,
  forceTailwind,
  fortify,
  lashTarget,
  riptideLash,
} from "../characters/tenzai/cards";
import type { Element } from "../characters/tenzai/types";
import {
  alchemyBlocker,
  catalyticStep,
  contaminate,
  magnumOpus,
  raidGraveyards,
  strictEquivalence,
} from "../characters/alchemist/cards";
import {
  alvaBlocker,
  apocalypseProtocol,
  dataCollapse,
  firewallLock,
  malwareInjection,
  overloadThruster,
} from "../characters/alva/cards";
import type { GameState, Player, PlayerId } from "../core/state";

/** Charge the Void Hunger feeds Zarek's Void. */
export const VOID_HUNGER_CHARGE = 2;
/** Tiles ahead the Hungry Rift reaches for a harm. */
export const HUNGRY_RIFT_RANGE = 15;

/** What a card's blockers look at beyond the player: the board and what covers or has emptied its tiles. */
export type HarmTable = Pick<
  GameState,
  | "board"
  | "blackFlames"
  | "winter"
  | "destroyedTraps"
  | "pinnedTraps"
  | "enchantedTiles"
  | "scarletFlames"
  | "players"
  | "elementals"
>;

/** A character's own card in someone else's hand (stolen) is dead; some need something more. */
export function exclusiveBlocker(table: HarmTable, player: Player, cardId: CardId): GameErrorCode | null {
  const { exclusive } = CARD_CATALOG[cardId];
  if (!exclusive) return null;
  if (player.ability !== exclusive) return "NOT_YOUR_CARD";
  switch (cardId) {
    case "hotBlood":
      return player.akane.innerFlame > 0 ? null : "NO_INNER_FLAME";
    case "scarletSupernova": {
      const { fires, burning } = supernovaFuel(table, player.id);
      return fires + burning > 0 ? null : "NO_FIRE";
    }
    case "voidHunger":
      return isAbilityReady(player) ? "ABILITY_ALREADY_READY" : null;
    case "hungryRift":
      if (player.zarek.hold.length >= VOID_CAPACITY) return "VOID_FULL";
      return harmAhead(table, player) ? null : "NO_HARM_AHEAD";
    case "voidEcho":
      if (player.zarek.hold.length === 0) return "VOID_EMPTY";
      return player.zarek.hold.length >= VOID_CAPACITY ? "VOID_FULL" : null;
    case "riptideLash":
      return table.elementals.tethers.some((tether) => tether.owner === player.id) ||
        lashTarget(table.board, table.players, player.id)
        ? null
        : "NO_TARGET_AHEAD";
    case "elementalExchange":
      return exchangeSource(table.elementals, player.id, null) ? null : "NO_CREATION";
    case "catalyticStep":
    case "strictEquivalence":
      return alchemyBlocker(table, player, cardId);
    case "overloadThruster":
      return alvaBlocker(table.players, player, cardId);
    default:
      return null;
  }
}

/** The first harm in sight within HUNGRY_RIFT_RANGE ahead: hidden traps stay secret, spent or covered ones are gone. */
function harmAhead(table: HarmTable, player: Player): { tile: TileId; threat: Threat } | null {
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
  element: Element | null = null,
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
    case "hotBlood":
      hotBlood(draft, playerId);
      return;
    case "emberStep":
      emberStep(draft, playerId);
      return;
    case "scarletFever":
      scarletFever(draft, playerId);
      return;
    case "pureFuel":
      pureFuel(draft, playerId);
      return;
    case "scarletSupernova":
      scarletSupernova(draft, playerId);
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
      const item = player.zarek.hold.at(-1);
      if (!item) return;
      updatePlayer(draft, playerId, (current) => ({ zarek: { idle: 0, hold: [...current.zarek.hold, item] } }));
      draft.events.push({ type: "voidEchoed", playerId, item });
      return;
    }
    case "tectonicFortification":
      fortify(draft, playerId);
      return;
    case "riptideLash":
      riptideLash(draft, playerId);
      return;
    case "forcedTailwind":
      if (targetId !== null) forceTailwind(draft, playerId, targetId);
      return;
    case "elementalExchange":
      exchangeElement(draft, playerId, element);
      return;
    case "elementalConvergence":
      convergeAll(draft, playerId);
      return;
    case "catalyticStep":
      catalyticStep(draft, playerId);
      return;
    case "polarityContamination":
      if (targetId !== null) contaminate(draft, playerId, targetId);
      return;
    case "graveyardRaider":
      raidGraveyards(draft, playerId);
      return;
    case "strictEquivalence":
      if (targetId !== null) strictEquivalence(draft, playerId, targetId);
      return;
    case "magnumOpus":
      magnumOpus(draft, playerId);
      return;
    case "malwareInjection":
      if (targetId !== null) malwareInjection(draft, playerId, targetId);
      return;
    case "overloadThruster":
      overloadThruster(draft, playerId);
      return;
    case "firewallLock":
      if (targetId !== null) firewallLock(draft, playerId, targetId);
      return;
    case "dataCollapse":
      if (targetId !== null) dataCollapse(draft, playerId, targetId);
      return;
    case "apocalypseProtocol":
      apocalypseProtocol(draft, playerId);
      return;
    case "voidApex":
      voidApex(draft, playerId);
      return;
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
    scarletFlames: draft.scarletFlames,
    players: draft.players,
    elementals: draft.elementals,
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
