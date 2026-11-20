import { describe, expect, it } from "vitest";
import { TRAINING_BOARD } from "@/game/domain/board/presets";
import { createGame } from "@/game/domain/core/engine";
import { HIDDEN } from "@/game/domain/core/hidden";
import { withPlayer } from "@/game/domain/testing";
import { createInitialView } from "@/features/match/model/matchView";
import { effectNote, tileOptions } from "./tileOptions";

const PLAYERS = [
  { id: "p1:scribe", name: "Escriba" },
  { id: "p2:witch", name: "Bruxa" },
];

function table() {
  const state = withPlayer(createGame(TRAINING_BOARD, PLAYERS, { seed: 1 }), "p2:witch", { position: 8 });
  return { board: state.board, view: createInitialView(state) };
}

describe("tileOptions", () => {
  it("sorts the tiles and says what each does and how far it is", () => {
    const { board, view } = table();
    const [plain, card, trap] = tileOptions([8, 2, 3], board, view, "p1:scribe");

    expect(plain).toMatchObject({ tile: 2, title: "Casa 2", realm: null, distance: "1 à frente", notes: [] });
    expect(card?.notes).toEqual(["Compra uma carta"]);
    expect(trap).toMatchObject({ distance: "7 à frente", occupants: ["Bruxa"] });
    expect(trap?.notes[0]).toMatch(/^Armadilha: volta à casa 6/);
  });

  it("names realm tracks and leaves their distance out", () => {
    const { board, view } = table();
    const trackTile = board.tiles.find((tile) => tile.track);
    if (!trackTile) throw new Error("the training board has realm tracks");
    const [option] = tileOptions([trackTile.id], board, view, "p1:scribe");
    expect(option?.realm).toMatch(/Inferno|Céu/);
    expect(option?.distance).toBeNull();
  });

  it("lists what lies on a tile, keeping others' secrets", () => {
    const { board, view } = table();
    const covered = {
      ...view,
      seals: [
        { tile: 4, owner: "p1:scribe", kind: "ruin" as const },
        { tile: 4, owner: "p2:witch", kind: HIDDEN as typeof HIDDEN },
      ],
      specters: [{ tile: 4, owner: "p2:witch", kind: "plunder" as const }],
      blackFlames: [{ tile: 4, owner: "p2:witch", turnsLeft: 2, burnsLeft: 2 }],
      destroyedTraps: [4],
    };
    const [option] = tileOptions([4], board, covered, "p1:scribe");
    expect(option?.notes).toEqual([
      expect.stringMatching(/^Bênção \(\+\d energia\)$/),
      "Selo da Ruína",
      "Selo de Bruxa",
      "Aparição de Bruxa",
      "Fogo negro",
      "Armadilha destruída",
    ]);
  });

  it("describes every kind of tile effect", () => {
    expect(effectNote({ kind: "none" })).toBeNull();
    expect(effectNote({ kind: "portal", to: 10 })).toBe("Portal → casa 10");
    expect(effectNote({ kind: "portal", to: 10, realm: "infernal" })).toBe("Portal para o Inferno");
    expect(effectNote({ kind: "advance", to: 9 })).toBe("Avança até a casa 9");
    expect(effectNote({ kind: "extraTurn" })).toBe("Joga de novo");
    expect(effectNote({ kind: "skipTurn" })).toBe("Perde a vez");
    expect(effectNote({ kind: "curse", curse: "discard" })).toBe("Maldição (-1 carta)");
  });
});
