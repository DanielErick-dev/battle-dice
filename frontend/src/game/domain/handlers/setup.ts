import { GameRuleError } from "../core/errors";
import { isPassive } from "../abilities/ability";
import type { AbilityId } from "../abilities/ability";
import { STARTING_ENERGY } from "../core/energy";
import { STARTING_HAND } from "../cards/hand";
import type { CardId } from "../cards/catalog";
import { buildDeck } from "../cards/decks";
import { placeHiddenTraps } from "../board/hiddenTraps";
import type { RandomSource } from "../core/random";
import type { Board } from "../board/types";
import type { GameState, Player, PlayerId } from "../core/state";

export interface NewPlayer {
  id: PlayerId;
  name: string;
  ability?: AbilityId | null;
}

/** A fresh match on `board`: players dealt in seat order first, then the hidden traps placed. */
export function openingState(
  board: Board,
  players: readonly NewPlayer[],
  decks: GameState["decks"],
  random: RandomSource,
): GameState {
  const dealt = players.map((player, index) => {
    const cards = decks[player.id];
    if (!cards) throw new GameRuleError("UNKNOWN_PLAYER");
    return dealPlayer(player, { startTile: board.startTile, cards, random, playsFirst: index === 0 });
  });
  return {
    board,
    players: dealt,
    decks,
    currentPlayerIndex: 0,
    status: "playing",
    winnerId: null,
    turn: 1,
    cardsPlayedThisTurn: 0,
    abilityInUse: null,
    bonusTurn: false,
    pendingDiscard: null,
    pendingWard: null,
    pendingGrace: null,
    hiddenTraps: placeHiddenTraps(board, random),
    destroyedTraps: [],
    pinnedTraps: [],
    seals: [],
    specters: [],
    enchantedTiles: [],
    blackFlames: [],
    scarletFlames: [],
    voidScars: [],
    winter: null,
    pendingPlunder: null,
  };
}

interface Deal {
  startTile: number;
  cards: readonly CardId[];
  random: RandomSource;
  /** The first turn is already under way: it counts towards the ability. */
  playsFirst: boolean;
}

function dealPlayer({ id, name, ability = null }: NewPlayer, { startTile, cards, random, playsFirst }: Deal): Player {
  const deck = buildDeck(id, cards, random);
  return {
    id,
    name,
    position: startTile,
    skipTurns: 0,
    energy: STARTING_ENERGY,
    energyCharge: 0,
    hand: deck.slice(0, STARTING_HAND),
    deck: deck.slice(STARTING_HAND),
    discard: [],
    shielded: false,
    diceBoost: null,
    diceBonuses: [],
    ability,
    abilityCharge: ability && playsFirst && !isPassive(ability) ? 1 : 0,
    levitating: 0,
    silencedTurns: 0,
    spectralArmour: 0,
    divineAegis: 0,
    untamed: 0,
    blessings: [],
    reversedRolls: 0,
    snowbound: null,
    realmEntry: null,
    chargeHeld: 0,
    crown: null,
    chained: 0,
    voidHold: [],
    voidIdle: 0,
    justiceMarks: 0,
    containedRolls: 0,
    burning: 0,
    burnedBy: null,
    innerFlame: 0,
    impetusRolls: 0,
    fuelRolls: 0,
    emberStep: false,
  };
}
