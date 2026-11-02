import { describe, expect, it } from "vitest";
import { TRAINING_BOARD } from "../../board/presets";
import { startDraft, draftState } from "../../core/draft";
import { ENCHANT_ADVANCE, HELL_ICE_ROUNDS, HELL_ICE_WEAK_ADVANCE, HELL_ICE_WEAK_AT, spreadWinter } from "./winter";
import { activate, newGame, playerOf, readyAbility, roll, withPlayer } from "../../testing";
import type { GameState } from "../../core/state";

const hellTiles = (state: GameState) => state.board.tracks.find((track) => track.realm === "infernal")?.tiles ?? [];

/** The fairy in hell under Eternal Winter, her ice laid on hell's second tile. */
function icedHell() {
  const start = newGame(TRAINING_BOARD, { fairy: "fairyBloom", rival: null });
  const [first, second] = hellTiles(start);
  const realmEntry = { portal: 5, exit: 10 };
  const inHell = withPlayer(readyAbility(start, "fairy"), "fairy", { position: first, realmEntry });
  const winter = { ...inHell, winter: { owner: "fairy", frontier: 1, iced: [] } };
  return { state: activate(winter, "fairy", { frostTiles: [second] }).state, first, second };
}

const rounds = (state: GameState, count: number) => {
  let current = state;
  for (let round = 0; round < count; round++) {
    const draft = startDraft(current, Math.random);
    spreadWinter(draft);
    current = draftState(draft);
  }
  return current;
};

/** Stepping onto her ice from the tile before it: how far past the ice she is carried. */
const carried = (state: GameState, first: number) => {
  const tiles = hellTiles(state);
  const onIce = withPlayer({ ...state, currentPlayerIndex: 0 }, "fairy", { position: first, abilityCharge: 0 });
  const { position } = playerOf(roll(onIce, "fairy", 1).state, "fairy");
  return tiles.indexOf(position) - tiles.indexOf(first) - 1;
};

describe("Eternal Winter in hell", () => {
  it("lets her ice a hell tile, which melts away over the rounds", () => {
    const { state, second } = icedHell();
    expect(state.winter?.melting).toEqual([{ tile: second, rounds: 0 }]);
    expect(rounds(state, HELL_ICE_ROUNDS - 1).winter?.melting).toEqual([{ tile: second, rounds: HELL_ICE_ROUNDS - 1 }]);
    expect(rounds(state, HELL_ICE_ROUNDS).winter?.melting).toEqual([]);
  });

  it(`carries her ${ENCHANT_ADVANCE} tiles, only ${HELL_ICE_WEAK_ADVANCE} once half melted`, () => {
    const { state, first } = icedHell();
    expect(carried(state, first)).toBe(ENCHANT_ADVANCE);
    expect(carried(rounds(state, HELL_ICE_WEAK_AT), first)).toBe(HELL_ICE_WEAK_ADVANCE);
  });
});
