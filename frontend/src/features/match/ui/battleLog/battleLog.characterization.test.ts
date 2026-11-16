import { describe, expect, it } from "vitest";
import { CLASSIC_BOARD } from "@/game/domain/board/presets";
import { createGame } from "@/game/domain/core/engine";
import type { GameEvent } from "@/game/domain/core/events";
import { battleLogLine } from ".";

const { players } = createGame(
  CLASSIC_BOARD,
  [
    { id: "p1", name: "Bruxa Carmesim" },
    { id: "p2", name: "Bjorn" },
    { id: "p3", name: "Zarek" },
  ],
  { seed: 1 },
);

type Fields = Readonly<Record<string, unknown>>;

const card = { uid: "c1", cardId: "windStep" };
const fused = { uid: "c2", cardId: "windStep", fused: true };
const none = [{}];

/** Every event, with one entry per branch its line can take; a missing event is a compile error. */
const CASES: Readonly<Record<GameEvent["type"], readonly Fields[]>> = {
  diceRolled: [
    { value: 4, dice: [4] },
    { value: 9, dice: [4, 5] },
    { value: 5, dice: [4, 5], best: true },
    { value: 6, dice: [4], bonus: 2 },
    { value: 12, dice: [4], multiplier: 3 },
    { value: 4, dice: [4], multiplier: 1 },
    { value: 2, dice: [4], halved: true },
    { value: 4, dice: [4], reversed: true },
  ],
  portalEntered: none,
  realmEntered: [{ realm: "celestial" }, { realm: "infernal" }],
  blessingReceived: ["energy", "charge", "shield", "wings", "halo", "inspiration", "spring"].map((blessing) => ({
    blessing,
  })),
  trapTriggered: [{ to: 3 }],
  advanceTriggered: [{ to: 9 }],
  trapCursed: [
    { curse: "discard", card },
    { curse: "discard", card: fused },
    { curse: "discard", card: null },
    { curse: "drain", energyLost: 2 },
  ],
  extraTurnGranted: none,
  skipTurnGained: [{}, { turns: 1 }, { turns: 2 }],
  turnSkipped: none,
  snowDrained: [{ energy: 1, owner: "p2" }],
  trapBlocked: ["shield", "ability", "halo", "untamed", "susanoo", "fallen"].map((ward) => ({ ward })),
  trapWeeded: [{ hidden: true }, { hidden: false, tile: 7 }],
  trapDestroyed: [{ hidden: true }, { hidden: false, tile: 7 }],
  arrowsLoosed: [
    { targets: [1], pinned: [] },
    { targets: [1, 2], pinned: [] },
    { targets: [], pinned: [3] },
    { targets: [], pinned: [3, 4] },
  ],
  gambleRolled: [
    { fortune: true, value: 5, won: true },
    { fortune: false, value: 1, won: false },
  ],
  cardsStolen: [
    { cards: [card], from: "p2" },
    { cards: [card, card], from: "p2" },
    { cards: [], from: "p2" },
  ],
  spectersSummoned: [{ tiles: [1] }, { tiles: [1, 2] }],
  specterStruck: [
    { kind: "plunder", owner: "p2", energyTaken: 0 },
    { kind: "hunger", owner: "p2", energyTaken: 2 },
  ],
  spectersDispelled: [{ owner: "p2" }],
  sealsWritten: [{ tiles: [1] }, { tiles: [1, 2] }],
  sealBroken: ["tithe", "ruin", "silence", "bloodPact"].map((kind) => ({ kind, owner: "p2" })),
  tilesEnchanted: [{ tiles: [1] }, { tiles: [1, 2] }],
  enchantmentStirred: [
    { owner: "p1", frozen: 0 },
    { owner: "p2", frozen: 1 },
    { owner: "p2", frozen: 2 },
  ],
  winterBegan: none,
  tilesFrozen: [{ tiles: [1] }, { tiles: [1, 2] }],
  flamesLit: [{ tiles: [1] }, { tiles: [1, 2] }],
  flamesScorched: [
    { owner: "p2", energyLost: 0 },
    { owner: "p2", energyLost: 2 },
  ],
  armourRaised: [{ turns: 1 }, { turns: 2 }],
  armourHeld: none,
  cardsResurrected: [{ cards: [card] }, { cards: [card, card] }],
  hiddenTrapSprung: none,
  levitatedOver: none,
  abilityReady: [{ ability: "silentVerdict" }, { ability: "levitation" }],
  abilityUsed: [{ ability: "levitation" }],
  abilityBlocked: ["untamed", "susanoo", "armour", "aegis", "away"].map((ward) => ({
    ability: "levitation",
    targetId: "p2",
    ward,
  })),
  cardBlocked: [{ cardId: "windStep", targetId: "p2", ward: "aegis" }],
  seraphielFell: none,
  crownGained: [{ crown: "infernal" }, { crown: "seraphic" }],
  heavenBarred: [{ rounds: 1 }, { rounds: 2 }],
  hellDragged: [{ targetId: "p2" }],
  boardCleansed: [{ tiles: [1] }, { tiles: [1, 2] }],
  timeBent: [
    { power: "halt", targetId: "p2", rounds: 2 },
    { power: "reverse", targetId: "p2", rounds: 1 },
  ],
  untamedUnleashed: [{ turns: 2 }],
  playerTrampled: [
    { by: "p2", path: [1] },
    { by: "p2", path: [1, 2], burning: true },
  ],
  scarletLit: [
    { tiles: [1], melted: [] },
    { tiles: [1, 2], melted: [1] },
    { tiles: [1, 2], melted: [1, 2] },
  ],
  playerIgnited: [
    { by: "p2", rounds: 1 },
    { by: "p2", rounds: 2 },
  ],
  fireQuenched: [
    { by: "p2", playerIds: ["p1"] },
    { by: "p2", playerIds: ["p1", "p3"] },
  ],
  innerFlameKindled: [{ flames: 2 }],
  impetusUnleashed: [{ rolls: 1 }, { rolls: 2 }],
  emberSlid: none,
  hotBloodBurst: [
    { targetIds: [], tiles: 2 },
    { targetIds: ["p2"], tiles: 1 },
    { targetIds: ["p2", "p3"], tiles: 2 },
  ],
  fuelPoured: [{ rolls: 2 }],
  fireFed: [
    { energy: 0, by: "p2" },
    { energy: 1, by: "p2" },
  ],
  emberStepReady: none,
  supernova: [{ fires: 3, burning: 1, tiles: 5 }],
  elementBent: [{ element: "earth" }, { element: "fire", doubled: true }],
  elementAttuned: [{ element: "water", elements: ["earth", "water"] }],
  convergenceAwakened: [{ turns: 2, bonus: 3 }],
  wallRaised: [{ tile: 12, hp: 8 }],
  wallStrengthened: [{ tile: 12, hp: 16 }],
  wallHit: [{ tile: 12, damage: 5, hp: 3 }],
  wallCrumbled: [{ owner: "p1", tile: 12 }],
  tetherBound: [{ targetId: "p2", turns: 3 }],
  tetherPulled: [{ targetId: "p2", path: [4, 5] }],
  tetherSnapped: [{ targetId: "p2" }],
  tetherSwapped: [{ targetId: "p2", from: 3, to: 9 }],
  combustionReady: [{ multiplier: 2 }],
  combustionExploded: [
    { tile: 9, pushed: ["p2"] },
    { tile: 9, pushed: [] },
  ],
  breezeArmed: [{ doubled: false }],
  breezeStolen: [{ victimId: "p2", value: 6, path: [2, 3] }],
  breezeResisted: [{ victimId: "p2" }],
  breezeFaded: none,
  voidSwallowed: [{ item: { kind: "skipTurn" } }],
  riftOpened: none,
  voidCast: [{ item: { kind: "flame" }, tile: 7 }],
  voidSeized: [{ item: { kind: "snow" }, tile: 7 }],
  voidEchoed: [{ item: { kind: "curse", curse: "drain" } }],
  susanooRepelled: [{ by: "p2" }],
  inversionStarted: [{ turns: 2 }],
  inversionEnded: [{}],
  tileInverted: [
    { tile: 14, outcome: "advance", amount: 4 },
    { tile: 26, outcome: "loseTurn", amount: 1 },
  ],
  condenserFed: none,
  graveyardOpened: [
    { picks: 1, own: true },
    { picks: 3, own: false },
  ],
  graveyardRaided: [{ cards: [{ from: "p2", card }] }],
  magnumOpus: [{ burnt: [card], taken: [{ from: "p2", card: fused }] }],
  empPulsed: [{ victims: ["p2"] }],
  memoryOverload: [{ burnt: [{ playerId: "p2", cards: [card] }] }, { burnt: [] }],
  corruptedInjected: [{ targetId: "p2", count: 2 }],
  corruptedPurged: [{ card }],
  brownoutSapped: [{ from: 6, to: 3 }],
  firewallLocked: [{ targetId: "p2", turns: 2 }],
  dataCollapsed: [{ targetId: "p2", weight: 8 }],
  alvaThrust: [{ tiles: 10 }],
  apocalypseProtocol: [{}],
  cardsFused: [{ card }],
  cardPlayed: [{ card }, { card: fused, targetId: "p2" }],
  cardDiscarded: [{ card }, { card: fused }],
  playerPushed: [
    { by: "p1", path: [1] },
    { by: "p2", path: [1, 2] },
  ],
  cardTeleported: [{ to: 9 }],
  playerWon: none,
  turnChanged: none,
  verdictPassed: [
    { attackerId: "p2", defendedId: "p3" },
    { attackerId: "p2", defendedId: null },
  ],
  justiceMarked: [
    { by: "p2", marks: 0 },
    { by: "p2", marks: 1 },
    { by: "p2", marks: 2 },
  ],
  turnTimedOut: none,
  justiceMarched: [{ own: 1, tiles: 2 }],
  justiceMarchEnded: none,
  decreeIssued: [{ rolls: 2, cap: 3 }],
  finalJudgment: [{ distance: 4, targetId: "p2", die: 2, tiles: 8 }],
  energySacrificed: [{ energy: 2 }],
  playerMoved: none,
  cardDrawn: none,
  deckReshuffled: none,
  discardRequired: none,
  wardOffered: none,
  graceOffered: none,
  plunderOffered: none,
  voidFed: none,
  winterSpread: none,
  flamesFaded: none,
  scarletFaded: none,
  trapUnpinned: none,
  gameRestarted: none,
};

describe("battle log lines, one per branch", () => {
  describe.each(Object.entries(CASES))("%s", (type, details) => {
    it.each(details.map((detail, index) => [index, detail] as const))("case %i", (_, detail) => {
      const event = { type, playerId: "p1", ...detail } as unknown as GameEvent;
      expect(battleLogLine(event, players)).toMatchSnapshot();
    });
  });

  it("marks an unknown player", () => {
    const event = { type: "turnSkipped", playerId: "nobody" } as GameEvent;
    expect(battleLogLine(event, players)).toMatchSnapshot();
  });
});
