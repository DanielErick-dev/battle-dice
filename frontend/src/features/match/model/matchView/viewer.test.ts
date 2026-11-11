import { describe, expect, it } from "vitest";
import { CLASSIC_BOARD } from "@/game/domain/board/presets";
import { createGame } from "@/game/domain/core/engine";
import type { MatchView } from "./view";
import { createInitialView } from "./create";
import { canActivateAbility, canPlayCard, canRoll } from "./queries";
import { viewerControls } from "./viewer";

const PLAYERS = [
  { id: "p1", name: "Aria" },
  { id: "p2", name: "Bran" },
];

function view(patch: Partial<MatchView> = {}): MatchView {
  return { ...createInitialView(createGame(CLASSIC_BOARD, PLAYERS, { seed: 1 })), ...patch };
}

const drawn = { uid: "c1", cardId: "windStep" } as const;
const NO_ANSWERS = { discard: false, ward: false, grace: false, plunder: false };

describe("viewerControls", () => {
  describe("hot-seat", () => {
    it("speaks for whoever's turn it is, exactly as the plain queries", () => {
      for (const shown of [view(), view({ isAnimating: true }), view({ activePlayerId: "p2" })]) {
        const controls = viewerControls(shown, null);
        expect(controls.viewerId).toBe(shown.activePlayerId);
        expect(controls.ownsTurn).toBe(true);
        expect(controls.canRoll).toBe(canRoll(shown));
        expect(controls.canPlayCard).toBe(canPlayCard(shown));
        expect(controls.canActivateAbility).toBe(canActivateAbility(shown));
        expect(controls.waitingFor).toBeNull();
      }
    });

    it("answers every prompt, whoever it is aimed at", () => {
      const controls = viewerControls(view({ pendingDiscard: { playerId: "p2", drawn } }), null);
      expect(controls.answers.discard).toBe(true);
      expect(controls.waitingFor).toBeNull();
    });
  });

  describe("pinned seat", () => {
    it("acts on its own turn", () => {
      const controls = viewerControls(view(), "p1");
      expect(controls).toMatchObject({ viewerId: "p1", ownsTurn: true, canRoll: true, waitingFor: null });
    });

    it("only watches someone else's turn", () => {
      const controls = viewerControls(view(), "p2");
      expect(controls).toEqual({
        viewerId: "p2",
        ownsTurn: false,
        canRoll: false,
        canPlayCard: false,
        canActivateAbility: false,
        answers: NO_ANSWERS,
        waitingFor: "p1",
      });
    });

    it("answers its own prompt even on someone else's turn", () => {
      const controls = viewerControls(view({ pendingDiscard: { playerId: "p2", drawn } }), "p2");
      expect(controls.answers.discard).toBe(true);
      expect(controls.canRoll).toBe(false);
      expect(controls.waitingFor).toBeNull();
    });

    it("waits on whoever owes a prompt, even on its own turn", () => {
      const controls = viewerControls(view({ pendingPlunder: { owner: "p2", victim: "p1" } }), "p1");
      expect(controls.answers.plunder).toBe(false);
      expect(controls.waitingFor).toBe("p2");
    });

    it("waits on no one once the match is over", () => {
      expect(viewerControls(view({ winnerId: "p1" }), "p2").waitingFor).toBeNull();
    });
  });
});
