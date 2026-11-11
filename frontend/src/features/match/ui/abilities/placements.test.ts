import { describe, expect, it, vi } from "vitest";
import { CLASSIC_BOARD } from "@/game/domain/board/presets";
import { createGame } from "@/game/domain/core/engine";
import { freezableTiles } from "@/game/domain/characters/fairy/winter";
import { flammableTiles } from "@/game/domain/characters/kage/flames";
import { sealableTiles } from "@/game/domain/characters/scribe/seals";
import { hauntableTiles } from "@/game/domain/characters/warden/specters";
import { harmGround, seizableTiles, spellGround } from "@/game/domain/characters/zarek/ground";
import type { VoidItem } from "@/game/domain/characters/zarek/types";
import type { Player } from "@/game/domain/types";
import type { MatchStore } from "../../model/matchStore";
import { createInitialView, type MatchView } from "../../model/matchView";
import { FLAME_STEPS, FROST_STEPS, SEAL_STEPS, SPECTER_STEPS, VOID_SEIZE_STEP } from "../placementText";
import { fairyBloom, forbiddenSeals, placementOf, spectralApparitions, theVoid } from "./placements";
import type { AbilityScene } from "./types";

function sceneWith(patch: { player?: Partial<Player>; view?: Partial<MatchView> } = {}): AbilityScene {
  const state = createGame(
    CLASSIC_BOARD,
    [
      { id: "p1", name: "Aria" },
      { id: "p2", name: "Bran" },
    ],
    { seed: 1 },
  );
  const view = { ...createInitialView(state), ...patch.view };
  const player = { ...state.players[0], position: 5, ...patch.player };
  return { board: state.board, view, player };
}

function fakeStore() {
  const activateAbility = vi.fn();
  const placeVoid = vi.fn();
  return { store: { activateAbility, placeVoid } as unknown as MatchStore, activateAbility, placeVoid };
}

describe("placementOf", () => {
  it("seals: tiles near the scribe, sent as sealTiles", () => {
    const scene = sceneWith();
    const spec = placementOf("seals", scene);
    expect(spec.steps).toBe(SEAL_STEPS);
    expect(spec.cursor).toBe("seals");
    expect(spec.tiles).toEqual(sealableTiles(scene.board, 5, []));
    expect(spec.tiles.length).toBeGreaterThan(0);

    const { store, activateAbility } = fakeStore();
    spec.send(store, [3, 6]);
    expect(activateAbility).toHaveBeenCalledWith({ sealTiles: [3, 6] });
  });

  it("seals: skips tiles already sealed or haunted", () => {
    const free = placementOf("seals", sceneWith()).tiles;
    const [sealed, haunted] = free;
    const scene = sceneWith({
      view: {
        seals: [{ tile: sealed, owner: "p2", kind: "ruin" }] as unknown as MatchView["seals"],
        specters: [{ tile: haunted, owner: "p2", kind: "plunder" }] as unknown as MatchView["specters"],
      },
    });
    const tiles = placementOf("seals", scene).tiles;
    expect(tiles).not.toContain(sealed);
    expect(tiles).not.toContain(haunted);
  });

  it("specters: tiles in the warden's range, sent as specterTiles", () => {
    const scene = sceneWith();
    const spec = placementOf("specters", scene);
    expect(spec.steps).toBe(SPECTER_STEPS);
    expect(spec.tiles).toEqual(hauntableTiles(scene.board, 5, []));

    const { store, activateAbility } = fakeStore();
    spec.send(store, [7]);
    expect(activateAbility).toHaveBeenCalledWith({ specterTiles: [7] });
  });

  it("flames: free main tiles, sent with the flames power", () => {
    const scene = sceneWith();
    const spec = placementOf("flames", scene);
    expect(spec.steps).toBe(FLAME_STEPS);
    expect(spec.tiles).toEqual(flammableTiles(scene.board, 5, []));

    const { store, activateAbility } = fakeStore();
    spec.send(store, [8, 9]);
    expect(activateAbility).toHaveBeenCalledWith({ power: "flames", flameTiles: [8, 9] });
  });

  it("flames: skips tiles already burning", () => {
    const [burning] = placementOf("flames", sceneWith()).tiles;
    const scene = sceneWith({
      view: { blackFlames: [{ tile: burning }] as unknown as MatchView["blackFlames"] },
    });
    expect(placementOf("flames", scene).tiles).not.toContain(burning);
  });

  it("frost: tiles the winter can still take, sent as frostTiles", () => {
    const winter = { owner: "p1", frontier: 0, iced: [] };
    const scene = sceneWith({ view: { winter } });
    const spec = placementOf("frost", scene);
    expect(spec.steps).toBe(FROST_STEPS);
    expect(spec.tiles).toEqual(freezableTiles(scene.board, 5, winter, scene.view.enchantedTiles, []));

    const { store, activateAbility } = fakeStore();
    spec.send(store, [10]);
    expect(activateAbility).toHaveBeenCalledWith({ frostTiles: [10] });
  });

  it("seize: another's spell, sent as the first picked tile", () => {
    const scene = sceneWith();
    const spec = placementOf("seize", scene);
    expect(spec.steps).toEqual([VOID_SEIZE_STEP]);
    expect(spec.cursor).toBe("void");
    expect(spec.tiles).toEqual(seizableTiles({ ...scene.view, board: scene.board }, "p1"));

    const { store, activateAbility } = fakeStore();
    spec.send(store, [12, 13]);
    expect(activateAbility).toHaveBeenCalledWith({ seizeTile: 12 });
  });

  describe("releasing from the Void", () => {
    const trap: VoidItem = { kind: "trap", back: 3 };
    const flame: VoidItem = { kind: "flame" };

    it("a harm opens a rift on harm ground", () => {
      const scene = sceneWith({ player: { voidHold: [flame, trap] } });
      const spec = placementOf({ release: 1, doubled: false }, scene);
      expect(spec.title).toBe("Abrir fenda");
      expect(spec.tiles).toEqual(harmGround({ ...scene.view, board: scene.board }));

      const { store, placeVoid } = fakeStore();
      spec.send(store, [14, 15]);
      expect(placeVoid).toHaveBeenCalledWith(1, 14, false);
    });

    it("a spell lands on spell ground, keeping the doubled flag", () => {
      const scene = sceneWith({ player: { voidHold: [flame] } });
      const spec = placementOf({ release: 0, doubled: true }, scene);
      expect(spec.title).toBe("Soltar do Vazio");
      expect(spec.tiles).toEqual(spellGround({ ...scene.view, board: scene.board }));

      const { store, placeVoid } = fakeStore();
      spec.send(store, [4]);
      expect(placeVoid).toHaveBeenCalledWith(0, 4, true);
    });

    it("an empty slot offers no tiles", () => {
      const spec = placementOf({ release: 2, doubled: false }, sceneWith({ player: { voidHold: [] } }));
      expect(spec.tiles).toEqual([]);
    });
  });
});

describe("placement flows", () => {
  it("start straight on the board", () => {
    const scene = sceneWith();
    expect(theVoid.start(scene)).toBe("seize");
    expect(forbiddenSeals.start(scene)).toBe("seals");
    expect(spectralApparitions.start(scene)).toBe("specters");
  });

  it("fairy bloom picks ice only once Eternal Winter has begun", () => {
    expect(fairyBloom.start(sceneWith())).toBeNull();
    const winter = { owner: "p1", frontier: 0, iced: [] };
    expect(fairyBloom.start(sceneWith({ view: { winter } }))).toBe("frost");
  });
});
