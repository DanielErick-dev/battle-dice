import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TileEffectKind, TileEffectView } from "../../model/matchView";
import { EffectBanner } from "./EffectBanner";

type Details = Partial<Omit<TileEffectView, "kind">>;

const owner = { owner: "p1", energyLost: 2, energyGained: 3 };
const specter = { owner: "p1", energyTaken: 2, energyGained: 1, chargeGained: 1 };
const swallowed = { void: { item: { kind: "skipTurn" as const } } };

/** Every kind, with one entry per branch its copy can take. */
const CASES: Readonly<Record<TileEffectKind, readonly Details[]>> = {
  portal: [{}],
  trap: [{}],
  hiddenTrap: [{}],
  advance: [{}],
  extraTurn: [{}],
  skipTurn: [{}],
  turnSkipped: [{}],
  voidSwallowed: [swallowed, {}],
  riftOpened: [{ void: { item: null, doubled: true } }, { void: { item: null } }],
  voidCast: [swallowed],
  voidSeized: [swallowed],
  voidEchoed: [swallowed],
  snowDrained: [{ count: 2, drainedBy: "Fada" }, { drainedBy: "Fada" }],
  trapBlocked: [
    { ward: { kind: "shield", hidden: false } },
    { ward: { kind: "shield", hidden: true } },
    { ward: { kind: "ability", hidden: false } },
    { ward: { kind: "ability", hidden: true } },
    { ward: { kind: "halo", hidden: false } },
    { ward: { kind: "untamed", hidden: false } },
    { ward: { kind: "susanoo", hidden: false } },
    { ward: { kind: "fallen", hidden: false } },
    {},
  ],
  trapCurse: [
    {},
    { curse: { kind: "discard", card: { uid: "c1", cardId: "windStep" }, energyLost: 0 } },
    { curse: { kind: "discard", card: null, energyLost: 0 } },
    { curse: { kind: "drain", card: null, energyLost: 2 } },
    { curse: { kind: "drain", card: null, energyLost: 0 } },
  ],
  realmEnter: [{ realm: "celestial" }, { realm: "infernal" }, {}],
  blessing: [
    {},
    { blessing: { kind: "shield", energyGained: 0 } },
    { blessing: { kind: "charge", energyGained: 0, charged: true } },
    { blessing: { kind: "charge", energyGained: 0, charged: false } },
    { blessing: { kind: "wings", energyGained: 0 } },
    { blessing: { kind: "halo", energyGained: 0, turns: 5 } },
    { blessing: { kind: "inspiration", energyGained: 0 } },
    { blessing: { kind: "spring", energyGained: 0 } },
    { blessing: { kind: "energy", energyGained: 2 } },
    { blessing: { kind: "energy", energyGained: 0 } },
  ],
  teleport: [{}],
  abilityReady: [{ ability: { id: "levitation" } }, {}],
  abilityUsed: [{ ability: { id: "levitation" } }, {}],
  levitated: [{}],
  gamble: [
    { gamble: { value: 1, won: true, fortune: true } },
    { gamble: { value: 2, won: true, fortune: true } },
    { gamble: { value: 6, won: true } },
    { gamble: { value: 4, won: true } },
    { gamble: { value: 1, won: false } },
    {},
  ],
  seal: [
    { seal: { kind: "tithe", ...owner } },
    { seal: { kind: "tithe", ...owner, owner: "p2" } },
    { seal: { kind: "ruin", ...owner } },
    { seal: { kind: "ruin", ...owner, owner: "p2" } },
    { seal: { kind: "silence", ...owner } },
    { seal: { kind: "silence", ...owner, energyGained: 0 } },
    { seal: { kind: "silence", ...owner, owner: "p2" } },
    { seal: { kind: "bloodPact", ...owner } },
    { seal: { kind: "bloodPact", ...owner, energyGained: 0 } },
    { seal: { kind: "bloodPact", ...owner, owner: "p2" } },
    {},
  ],
  enchanted: [{ enchanted: { owner: "p1", frozen: 0 } }, { enchanted: { owner: "p2", frozen: 2 } }, {}],
  flames: [{ flames: { energyLost: 2 } }, {}],
  winter: [{}],
  armour: [{}],
  cleansed: [{ count: 4 }, {}],
  trampled: [{ count: 3 }, {}],
  repelled: [{}, { from: 7, to: 3 }, { from: 3, to: 7 }],
  timeBent: [
    { time: "halt", count: 2 },
    { time: "reverse", count: 2 },
  ],
  specter: [
    { specter: { kind: null, ...specter } },
    { specter: { kind: "plunder", ...specter } },
    { specter: { kind: "plunder", ...specter, owner: "p2" } },
    { specter: { kind: "hunger", ...specter } },
    { specter: { kind: "hunger", ...specter, owner: "p2" } },
    { specter: { kind: "hunger", ...specter, owner: "p2", chargeGained: 0 } },
    {},
  ],
  fallen: [{}],
  crown: [{ crown: "infernal" }, { crown: "seraphic" }],
  heavenBarred: [{}],
  dragged: [{}],
  abilityBlocked: [
    { blocked: { ability: "levitation", ward: "untamed", targetName: "Ana" } },
    { blocked: { cardId: "windStep", ward: "susanoo", targetName: "Ana" } },
    { blocked: { ward: "armour", targetName: "Ana" } },
    { blocked: { ward: "aegis", targetName: "Ana" } },
    { blocked: { ward: "away", targetName: "Ana" } },
    {},
  ],
  verdict: [
    { verdict: { judgeName: "Têmis", defendedName: "Ana", cardId: "windStep" } },
    { verdict: { judgeName: "Têmis", ability: "levitation" } },
    { verdict: { judgeName: "Têmis" } },
    {},
  ],
  marked: [{ count: 0 }, { count: 1 }, { count: 2 }, {}],
  marched: [{ count: 3 }, {}],
  decree: [{ count: 3 }, {}],
  judgment: [{ count: 4, judgment: { die: 2, distance: 2 } }, {}],
  timedOut: [{}],
  scarletLit: [{ count: 3 }, {}],
  ignited: [{ count: 3 }, {}],
  quenched: [{ count: 2 }, { count: 1 }, {}],
  kindled: [{ count: 3 }, { count: 1 }, {}],
  impetus: [{ count: 2 }, {}],
  emberSlid: [{}],
  hotBlood: [{ count: 2 }, {}],
  fuel: [{ count: 2 }, {}],
  emberStep: [{}],
  supernova: [{ count: 5 }, {}],
  weeded: [{}],
  burntRoll: [{ count: 2 }, { count: 0 }],
  fireFed: [{ count: 1 }, { count: 0 }],
};

const nameOf = (id: string) => (id === "p1" ? "Bruxa" : null);

function bannerOf(effect: TileEffectView | null, winnerName: string | null = null): string {
  return renderToStaticMarkup(createElement(EffectBanner, { effect, winnerName, nameOf }));
}

describe("EffectBanner", () => {
  it("shows nothing without an effect", () => {
    expect(bannerOf(null)).toBe("");
  });

  it("shows the winner over any effect", () => {
    expect(bannerOf({ kind: "trap", playerId: "p1", from: 1, to: 2 }, "Bruxa")).toMatchSnapshot();
  });

  it("falls back to an empty name for an unknown player", () => {
    expect(bannerOf({ kind: "extraTurn", playerId: "nobody", from: 1, to: 1 })).toMatchSnapshot();
  });

  describe.each(Object.entries(CASES))("%s", (kind, details) => {
    it.each(details.map((detail, index) => [index, detail] as const))("case %i", (_, detail) => {
      const effect = { kind: kind as TileEffectKind, playerId: "p1", from: 3, to: 9, ...detail };
      expect(bannerOf(effect)).toMatchSnapshot();
    });
  });
});
