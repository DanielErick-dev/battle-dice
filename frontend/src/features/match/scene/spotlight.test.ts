import { describe, expect, it } from "vitest";
import type { MatchView, TileEffectView } from "../model/matchView";
import { spotlightOf } from "./spotlight";

const effect = (kind: TileEffectView["kind"], playerId: string): TileEffectView => ({ kind, playerId, from: 3, to: 3 });
const viewWith = (patch: { effect?: TileEffectView | null; fx?: Partial<MatchView["fx"]> }): MatchView =>
  ({
    effect: patch.effect ?? null,
    fx: { trample: null, verdict: null, ...patch.fx },
  }) as unknown as MatchView;

describe("the camera's spotlight", () => {
  it("films whoever uses their ability, once per use", () => {
    const first = spotlightOf(viewWith({ effect: effect("abilityUsed", "p2") }));
    const again = spotlightOf(viewWith({ effect: effect("abilityUsed", "p2") }));
    expect(first?.playerId).toBe("p2");
    expect(again?.key).not.toBe(first?.key);
  });

  it("films Themis, not her attacker, when her verdict turns an attack away", () => {
    const shot = spotlightOf(
      viewWith({
        effect: effect("verdict", "attacker"),
        fx: { verdict: { id: 4, judgeId: "themis", attackerId: "attacker", phase: "weigh" } },
      }),
    );
    expect(shot).toMatchObject({ key: "verdict4", playerId: "themis" });
    expect(shot!.distance).toBeGreaterThan(1);
  });

  it("films the Berserker as he shoves, not the Susanoo's throw", () => {
    const trample = { id: 2, by: "bjorn", victim: "p1", tile: 5, phase: "shove", susanoo: false };
    expect(spotlightOf(viewWith({ fx: { trample } as never }))?.playerId).toBe("bjorn");
    expect(spotlightOf(viewWith({ fx: { trample: { ...trample, susanoo: true } } as never }))).toBeNull();
  });

  it("films whoever a card made lose a turn, but not a lost-turn tile", () => {
    expect(spotlightOf(viewWith({ effect: { ...effect("skipTurn", "p1"), aimed: true } }))?.playerId).toBe("p1");
    expect(spotlightOf(viewWith({ effect: effect("skipTurn", "p1") }))).toBeNull();
  });

  it("leaves the camera alone for moves that aren't a figure's own", () => {
    expect(spotlightOf(viewWith({ effect: effect("trap", "p1") }))).toBeNull();
  });
});
