import { describe, expect, it } from "vitest";
import { createBoard, getTile } from "./board";
import { byDistanceFrom, inHellTrack, isRegularMainTile, isSpellGround } from "./tileGround";

const board = createBoard({
  size: 30,
  effects: {
    5: { kind: "portal", to: 12, realm: "infernal" },
    15: { kind: "portal", to: 22, realm: "celestial" },
  },
});
const trackTile = (realm: "infernal" | "celestial") => {
  const tile = board.tiles.find(({ track }) => track?.realm === realm);
  if (!tile) throw new Error(`No ${realm} track`);
  return tile;
};

describe("byDistanceFrom", () => {
  it("sorts nearest first, the lower id on ties", () => {
    expect([1, 12, 8, 10, 9, 11].sort(byDistanceFrom(10))).toEqual([10, 9, 11, 8, 12, 1]);
  });
});

describe("tile ground", () => {
  it("counts a plain main-path tile as regular main ground", () => {
    expect(isRegularMainTile(getTile(board, 3))).toBe(true);
    expect(isSpellGround(getTile(board, 3))).toBe(true);
  });

  it("leaves out the start and the finish", () => {
    for (const tile of [board.startTile, board.finishTile]) {
      expect(isRegularMainTile(getTile(board, tile))).toBe(false);
      expect(isSpellGround(getTile(board, tile))).toBe(false);
    }
  });

  it("takes hell as spell ground but never as a main tile", () => {
    const hell = trackTile("infernal");
    expect(inHellTrack(hell)).toBe(true);
    expect(isRegularMainTile(hell)).toBe(false);
    expect(isSpellGround(hell)).toBe(true);
  });

  it("keeps heaven out", () => {
    const heaven = trackTile("celestial");
    expect(inHellTrack(heaven)).toBe(false);
    expect(isSpellGround(heaven)).toBe(false);
  });
});
