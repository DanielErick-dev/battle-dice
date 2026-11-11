import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CommandResult,
  GameClient,
  GameUpdate,
  GameUpdateListener,
  Snapshot,
} from "@/game/application/gameClient";
import { LocalGameClient } from "@/game/application/localGameClient";
import type { GameCommand } from "@/game/domain/core/commands";
import { CLASSIC_BOARD } from "@/game/domain/board/presets";
import { HAND_LIMIT } from "@/game/domain/cards/hand";
import { loadedDice } from "@/game/domain/testing";
import { createGame } from "@/game/domain/core/engine";
import type { CardInstance, GameState } from "@/game/domain/types";
import { DEFAULT_TIMINGS } from "@/features/shared/config";
import { MatchStore } from "./matchStore";
import { itemAt } from "@/features/shared/collections/items";

const PLAYERS = [
  { id: "p1", name: "Aria" },
  { id: "p2", name: "Bran" },
];

async function setup(rolls: number[], patch: (state: GameState) => GameState = (state) => state) {
  const client = new LocalGameClient(patch(createGame(CLASSIC_BOARD, PLAYERS, { seed: 1 })), loadedDice(rolls));
  const store = new MatchStore(client);
  await store.open();
  return { store, disconnect: store.close };
}

function shown(store: MatchStore) {
  const view = store.getSnapshot();
  if (!view) throw new Error("not connected");
  return view;
}

const positionOf = (store: MatchStore, id: string) => shown(store).players.find((p) => p.id === id)?.position;

describe("MatchStore", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("replays movement one tile at a time", async () => {
    const { store } = await setup([3]);

    store.rollDice();
    expect(shown(store).isRolling).toBe(true);
    expect(positionOf(store, "p1")).toBe(1);

    vi.advanceTimersByTime(DEFAULT_TIMINGS.diceRollMs);
    expect(shown(store).lastRoll).toEqual({
      dice: [3],
      best: false,
      bonus: 0,
      multiplier: 1,
      halved: false,
      total: 3,
    });

    vi.advanceTimersByTime(DEFAULT_TIMINGS.diceRevealMs);
    expect(positionOf(store, "p1")).toBe(2);

    vi.runAllTimers();
    expect(positionOf(store, "p1")).toBe(4);
    expect(shown(store).activePlayerId).toBe("p2");
    expect(shown(store).isAnimating).toBe(false);
  });

  it("ignores rolls while an animation is playing", async () => {
    const { store } = await setup([3, 6]);

    store.rollDice();
    store.rollDice();
    vi.runAllTimers();

    expect(positionOf(store, "p1")).toBe(4);
    expect(positionOf(store, "p2")).toBe(1);
  });

  it("exposes the portal effect before teleporting", async () => {
    const { store } = await setup([4]);

    store.rollDice();
    vi.advanceTimersByTime(DEFAULT_TIMINGS.diceRollMs + DEFAULT_TIMINGS.diceRevealMs + 4 * DEFAULT_TIMINGS.stepMs);
    expect(shown(store).effect).toMatchObject({ kind: "portal", from: 5, to: 10 });
    expect(positionOf(store, "p1")).toBe(5);

    vi.runAllTimers();
    expect(positionOf(store, "p1")).toBe(10);
  });

  it("stops playback on disconnect", async () => {
    const { store, disconnect } = await setup([3]);

    store.rollDice();
    disconnect();
    vi.runAllTimers();

    expect(positionOf(store, "p1")).toBe(1);
  });

  describe("cards", () => {
    const withP1 = (hand: CardInstance[], energy: number) => (state: GameState) => ({
      ...state,
      players: state.players.map((player) => (player.id === "p1" ? { ...player, hand, energy } : player)),
    });
    const barrier = { uid: "b", cardId: "arcaneShield" } as const;

    it("plays a card: pays energy, removes it from the hand and announces the cast", async () => {
      const { store } = await setup([1], withP1([barrier], 3));

      store.playCard("b");
      const view = shown(store);
      expect(view.fx.cast).toMatchObject({ id: 1, playerId: "p1", card: barrier });
      expect(view.players[0]?.hand).toEqual([]);
      expect(view.players[0]?.energy).toBe(1);

      vi.runAllTimers();
      expect(shown(store).players[0]?.shielded).toBe(true);
      store.playCard("b");
      expect(shown(store).cardsPlayedThisTurn).toBe(1);
    });

    it("reveals a drawn card in the middle of the screen before it joins the hand", async () => {
      const onCardTile = (state: GameState) => ({
        ...withP1([], 1)(state),
        board: {
          ...state.board,
          tiles: state.board.tiles.map((tile) =>
            tile.id === 2 ? { ...tile, effect: { kind: "card" as const } } : tile,
          ),
        },
      });
      const { store } = await setup([1], onCardTile);
      const deckSize = itemAt(shown(store).players, 0).deck.length;

      store.rollDice();
      vi.advanceTimersByTime(DEFAULT_TIMINGS.diceRollMs + DEFAULT_TIMINGS.diceRevealMs + DEFAULT_TIMINGS.stepMs);
      const revealing = shown(store);
      expect(revealing.fx.drawing).toMatchObject({ id: 1, playerId: "p1" });
      expect(revealing.players[0]?.hand).toEqual([]);
      expect(revealing.players[0]?.deck).toHaveLength(deckSize - 1);

      vi.advanceTimersByTime(DEFAULT_TIMINGS.drawRevealMs);
      const dealt = shown(store);
      expect(dealt.fx.drawing).toBeNull();
      expect(dealt.players[0]?.hand).toEqual([revealing.fx.drawing?.card]);
      expect(dealt.lastDrawnUid).toBe(revealing.fx.drawing?.card.uid);
    });

    it("announces what a cursed trap took", async () => {
      const cursedTrap = (state: GameState) => ({
        ...withP1([], 3)(state),
        board: {
          ...state.board,
          tiles: state.board.tiles.map((tile) =>
            tile.id === 2 ? { ...tile, effect: { kind: "trap" as const, to: 1, curse: "drain" as const } } : tile,
          ),
        },
      });
      const { store } = await setup([1], cursedTrap);

      store.rollDice();
      vi.runAllTimers();
      const view = shown(store);
      expect(view.effect).toMatchObject({ kind: "trapCurse", playerId: "p1", curse: { kind: "drain", energyLost: 2 } });
      expect(view.players[0]?.energy).toBe(1);
    });

    it("waits for a discard when the hand overflows, then resumes", async () => {
      const uids = ["x", "y", "z", "u", "v", "w", "s", "t"].slice(0, HAND_LIMIT);
      const full: CardInstance[] = uids.map((uid) => ({ uid, cardId: "healingHerb" }));
      const onCardTile = (state: GameState) => ({
        ...withP1(full, 1)(state),
        board: {
          ...state.board,
          tiles: state.board.tiles.map((tile) =>
            tile.id === 2 ? { ...tile, effect: { kind: "card" as const } } : tile,
          ),
        },
      });
      const { store } = await setup([1], onCardTile);

      store.rollDice();
      vi.runAllTimers();
      const paused = shown(store);
      expect(paused.pendingDiscard?.playerId).toBe("p1");
      store.rollDice();
      expect(shown(store).isRolling).toBe(false);

      store.discardCard("y");
      vi.runAllTimers();
      const resumed = shown(store);
      expect(resumed.pendingDiscard).toBeNull();
      expect(resumed.players[0]?.hand.map(({ uid }) => uid)).toEqual([
        ...uids.filter((uid) => uid !== "y"),
        paused.pendingDiscard?.drawn.uid,
      ]);
      expect(resumed.activePlayerId).toBe("p2");
    });
  });

  describe("connection", () => {
    /** A remote-like client: the test decides when the snapshot lands and what the server answers. */
    class FakeClient implements GameClient {
      readonly sent: GameCommand[] = [];
      result: Promise<CommandResult> = Promise.resolve({ ok: true });
      private listeners = new Set<GameUpdateListener>();
      private resolveSnapshot: (snapshot: Snapshot) => void = () => {};

      connect = () => new Promise<Snapshot>((resolve) => (this.resolveSnapshot = resolve));
      send = (command: GameCommand) => {
        this.sent.push(command);
        return this.result;
      };
      subscribe = (listener: GameUpdateListener) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
      };
      close = () => this.listeners.clear();
      land = (snapshot: Snapshot) => this.resolveSnapshot(snapshot);
      emit = (update: GameUpdate) => this.listeners.forEach((listener) => listener(update));
    }

    const game = createGame(CLASSIC_BOARD, PLAYERS, { seed: 1 });
    const at = (position: number): GameState => ({
      ...game,
      players: game.players.map((player) => (player.id === "p1" ? { ...player, position } : player)),
    });

    async function joined(snapshot: Partial<Snapshot> = {}) {
      const client = new FakeClient();
      const store = new MatchStore(client);
      const opening = store.open();
      client.land({ seq: 0, state: game, localPlayerId: null, ...snapshot });
      await opening;
      return { client, store };
    }

    it("shows nothing until the snapshot arrives", async () => {
      const client = new FakeClient();
      const store = new MatchStore(client);
      const opening = store.open();
      expect(store.getSnapshot()).toBeNull();
      expect(store.board).toBeNull();

      client.land({ seq: 3, state: at(7), localPlayerId: null });
      await opening;
      expect(positionOf(store, "p1")).toBe(7);
      expect(store.board).toBe(game.board);
    });

    it("drops a snapshot that lands after close", async () => {
      const client = new FakeClient();
      const store = new MatchStore(client);
      const opening = store.open();
      store.close();
      client.land({ seq: 0, state: game, localPlayerId: null });
      await opening;
      expect(store.getSnapshot()).toBeNull();
    });

    it("ignores updates it already has, by seq", async () => {
      const { client, store } = await joined({ seq: 2 });

      client.emit({ seq: 2, state: at(9), events: [] });
      vi.runAllTimers();
      expect(positionOf(store, "p1")).toBe(1);

      client.emit({ seq: 3, state: at(4), events: [] });
      client.emit({ seq: 3, state: at(9), events: [] });
      vi.runAllTimers();
      expect(positionOf(store, "p1")).toBe(4);
    });

    it("keeps an update that raced the snapshot only if the snapshot doesn't cover it", async () => {
      const client = new FakeClient();
      const store = new MatchStore(client);
      const opening = store.open();
      client.emit({ seq: 1, state: at(3), events: [] });
      client.emit({ seq: 2, state: at(6), events: [] });
      client.land({ seq: 1, state: at(3), localPlayerId: null });
      await opening;
      vi.runAllTimers();
      expect(positionOf(store, "p1")).toBe(6);
    });

    it("plays through a seq gap: each update carries the full state", async () => {
      const { client, store } = await joined();

      client.emit({ seq: 3, state: at(8), events: [] });
      vi.runAllTimers();
      expect(positionOf(store, "p1")).toBe(8);

      client.emit({ seq: 2, state: at(5), events: [] });
      vi.runAllTimers();
      expect(positionOf(store, "p1")).toBe(8);
    });

    it("shows a refused command from its plain error code", async () => {
      const { client, store } = await joined();
      client.result = Promise.resolve({ ok: false, code: "NOT_YOUR_TURN" });

      store.rollDice();
      expect(shown(store).isAnimating).toBe(true);
      await client.result;
      expect(shown(store).error).toEqual({ id: 1, message: "Não é a sua vez." });
      expect(shown(store).isAnimating).toBe(false);
    });

    it("reports a transport failure apart from a rule refusal", async () => {
      const { client, store } = await joined();
      client.result = Promise.reject(new Error("socket closed"));

      store.rollDice();
      await client.result.catch(() => {});
      expect(shown(store).error?.message).toBe("Falha ao enviar a jogada.");
    });

    it("hot-seat: the local player follows whoever's turn it is", async () => {
      const { client, store } = await joined();
      expect(store.localPlayerId).toBe("p1");

      client.emit({ seq: 1, state: { ...game, currentPlayerIndex: 1 }, events: [] });
      vi.runAllTimers();
      expect(store.localPlayerId).toBe("p2");
      store.rollDice();
      expect(client.sent).toEqual([{ type: "rollDice", playerId: "p2" }]);
    });

    it("a pinned seat only sends commands for itself", async () => {
      const { client, store } = await joined({ localPlayerId: "p2" });
      expect(store.localPlayerId).toBe("p2");

      store.rollDice();
      expect(client.sent).toEqual([]);
      expect(shown(store).isAnimating).toBe(false);

      client.emit({ seq: 1, state: { ...game, currentPlayerIndex: 1 }, events: [] });
      vi.runAllTimers();
      store.rollDice();
      expect(client.sent).toEqual([{ type: "rollDice", playerId: "p2" }]);
    });

    it("a pinned seat's hourglass never forfeits someone else's turn", async () => {
      const { client, store } = await joined({ localPlayerId: "p2" });

      store.forfeitTurn();
      expect(client.sent).toEqual([]);

      client.emit({ seq: 1, state: { ...game, currentPlayerIndex: 1 }, events: [] });
      vi.runAllTimers();
      store.forfeitTurn();
      expect(client.sent).toEqual([{ type: "forfeitTurn", playerId: "p2" }]);
    });
  });
});
