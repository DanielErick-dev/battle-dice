import { describe, expect, it } from "vitest";
import { abilityBlocker } from "../abilities/blocker";
import { POWER_TOURNAMENT_BOARD } from "../board/presets";
import { cardBlocker } from "../cards/blocker";
import { harmGround, seizableTiles, spellGround } from "../characters/zarek/ground";
import { HARM_AHEAD_BOARD, newGame, playerOf, send, withPlayer } from "../testing";
import type { GameCommand } from "./commands";
import { applyCommand, createGame, currentPlayer } from "./engine";
import type { GameEvent } from "./events";
import { HIDDEN, isHiddenCard } from "./hidden";
import { projectEvents, projectState, type ViewerId } from "./projection";
import type { CardInstance, GameState, PlayerId } from "./state";

const SEATS = {
  scribe: "forbiddenSeals",
  themis: "silentVerdict",
  zarek: "theVoid",
  warden: "spectralApparitions",
} as const;
const VIEWERS: ViewerId[] = [...Object.keys(SEATS), null];

/** Every kind of secret at once: seals, a seal in the Void, Themis half charged, hidden traps (one pinned). */
function secretive(): GameState {
  const state = withPlayer(withPlayer(newGame(HARM_AHEAD_BOARD, SEATS), "themis", { abilityCharge: 3 }), "zarek", {
    zarek: { hold: [{ kind: "seal", seal: "bloodPact" }, { kind: "flame" }], idle: 0 },
  });
  return {
    ...state,
    seals: [
      { tile: 24, kind: "ruin", owner: "scribe" },
      { tile: 26, kind: "tithe", owner: "scribe" },
    ],
    hiddenTraps: [33, 41],
    pinnedTraps: [41],
  };
}

const json = (value: unknown) => JSON.stringify(value);
const uids = (cards: readonly CardInstance[]) => cards.map((card) => card.uid);
const othersOf = (state: GameState, viewerId: ViewerId) => state.players.filter((player) => player.id !== viewerId);

function expectNoneIn(serialized: string, secrets: readonly string[]) {
  for (const secret of secrets) expect(serialized).not.toContain(secret);
}

describe("projectState", () => {
  it("shows a hand only to its owner; the others just count face-down cards", () => {
    const state = secretive();
    for (const viewerId of VIEWERS) {
      const projected = projectState(state, viewerId);
      for (const other of othersOf(state, viewerId)) {
        expectNoneIn(json(projected), uids(other.hand));
        const seen = playerOf(projected, other.id).hand;
        expect(seen).toHaveLength(other.hand.length);
        expect(seen.every(isHiddenCard)).toBe(true);
      }
      if (viewerId) expect(playerOf(projected, viewerId).hand).toEqual(playerOf(state, viewerId).hand);
    }
  });

  it("turns every deck into a face-down pile of the same size, the owner's own included", () => {
    const state = secretive();
    for (const viewerId of VIEWERS) {
      const projected = projectState(state, viewerId);
      for (const player of state.players) {
        expectNoneIn(json(projected), uids(player.deck));
        expect(playerOf(projected, player.id).deck).toHaveLength(player.deck.length);
      }
    }
  });

  it("keeps a deck list only for its owner", () => {
    const state = secretive();
    const projected = projectState(state, "scribe");
    expect(projected.decks.scribe).toEqual(state.decks.scribe);
    expect(projected.decks.themis).toEqual([]);
    expect(projectState(state, null).decks.scribe).toEqual([]);
  });

  it("leaves the discard pile face up for all", () => {
    const state = withPlayer(secretive(), "scribe", { discard: [{ uid: "pile-1", cardId: "windStep" }] });
    for (const viewerId of VIEWERS) {
      expect(playerOf(projectState(state, viewerId), "scribe").discard).toEqual([
        { uid: "pile-1", cardId: "windStep" },
      ]);
    }
  });

  it("hides the hidden traps from everyone, but those Arrow Rain pinned and so revealed", () => {
    const state = secretive();
    for (const viewerId of VIEWERS) expect(projectState(state, viewerId).hiddenTraps).toEqual([41]);
  });

  it("shows which seal is which only to the Scribe who wrote it", () => {
    const state = secretive();
    expect(projectState(state, "scribe").seals).toEqual(state.seals);
    for (const viewerId of VIEWERS.filter((id) => id !== "scribe")) {
      const projected = projectState(state, viewerId);
      expect(projected.seals).toEqual([
        { tile: 24, kind: HIDDEN, owner: "scribe" },
        { tile: 26, kind: HIDDEN, owner: "scribe" },
      ]);
      expectNoneIn(json(projected.seals), ['"ruin"', '"tithe"']);
    }
  });

  it("shows a seal held in the Void only to Zarek; the rest of the Void is public", () => {
    const state = secretive();
    expect(playerOf(projectState(state, "zarek"), "zarek").zarek.hold).toEqual(playerOf(state, "zarek").zarek.hold);
    for (const viewerId of VIEWERS.filter((id) => id !== "zarek")) {
      const held = playerOf(projectState(state, viewerId), "zarek").zarek.hold;
      expect(held).toEqual([{ kind: "seal", seal: HIDDEN }, { kind: "flame" }]);
      expect(json(projectState(state, viewerId))).not.toContain('"bloodPact"');
    }
  });

  it("keeps Themis's charge to herself: the Silent Verdict arms in secret", () => {
    const state = secretive();
    expect(playerOf(projectState(state, "themis"), "themis").abilityCharge).toBe(3);
    for (const viewerId of VIEWERS.filter((id) => id !== "themis")) {
      expect(playerOf(projectState(state, viewerId), "themis").abilityCharge).toBe(0);
    }
    expect(playerOf(projectState(state, "themis"), "scribe").abilityCharge).toBe(
      playerOf(state, "scribe").abilityCharge,
    );
  });

  it("seals the random stream, so nobody can foresee dice, shuffles or where a trap moves", () => {
    const state = { ...secretive(), rng: { seed: 987654321, counter: 4242 } };
    for (const viewerId of VIEWERS) {
      const projected = projectState(state, viewerId);
      expect(projected.rng).toEqual({ seed: 0, counter: 0 });
      expectNoneIn(json(projected), ["987654321", "4242"]);
    }
  });

  it("shows a card waiting for a discard only to whoever drew it", () => {
    const state: GameState = {
      ...secretive(),
      pendingDiscard: {
        playerId: "scribe",
        drawn: { uid: "drawn-1", cardId: "fateRune" },
        queued: [{ playerId: "themis", card: { uid: "queued-1", cardId: "windStep" } }],
        endsTurn: true,
        extraTurn: false,
      },
    };
    expect(projectState(state, "scribe").pendingDiscard?.drawn.uid).toBe("drawn-1");
    expect(projectState(state, "themis").pendingDiscard?.queued[0]?.card.uid).toBe("queued-1");
    expectNoneIn(json(projectState(state, "themis")), ["drawn-1"]);
    expectNoneIn(json(projectState(state, "scribe")), ["queued-1"]);
    expectNoneIn(json(projectState(state, null)), ["drawn-1", "queued-1"]);
  });

  it("lets the Warden see the victim's hand while he picks what his Plunder takes", () => {
    const state: GameState = {
      ...secretive(),
      pendingPlunder: { owner: "warden", victim: "scribe", endsTurn: true, extraTurn: false },
    };
    const victim = playerOf(state, "scribe").hand;
    expect(playerOf(projectState(state, "warden"), "scribe").hand).toEqual(victim);
    expectNoneIn(json(projectState(state, "themis")), uids(victim));
  });

  it("gives the screen's rule queries the same answers on the projected state", () => {
    const state = secretive();
    for (const viewerId of ["scribe", "zarek"] as const) {
      const projected = projectState(state, viewerId);
      const own = playerOf(projected, viewerId);
      expect(abilityBlocker(own)).toBe(abilityBlocker(playerOf(state, viewerId)));
      for (const card of own.hand) {
        expect(cardBlocker(projected, own, card.cardId)).toBe(
          cardBlocker(state, playerOf(state, viewerId), card.cardId),
        );
      }
      expect(seizableTiles(projected, viewerId)).toEqual(seizableTiles(state, viewerId));
      expect(spellGround(projected)).toEqual(spellGround(state));
      expect(harmGround(projected)).toEqual(harmGround(state));
    }
  });
});

describe("projectEvents", () => {
  it("shows a drawn card only to whoever drew it", () => {
    const state = withPlayer(secretive(), "scribe", { energy: 5 });
    const { events } = send(state, { type: "sacrificeEnergy", playerId: "scribe" });
    const drawn = events.find((event) => event.type === "cardDrawn");
    if (drawn?.type !== "cardDrawn") throw new Error("no card drawn");
    expect(projectEvents(events, "scribe")).toEqual(events);
    for (const viewerId of VIEWERS.filter((id) => id !== "scribe")) {
      const seen = projectEvents(events, viewerId);
      expectNoneIn(json(seen), [drawn.card.uid]);
      expect(seen).toContainEqual({
        type: "cardDrawn",
        playerId: "scribe",
        card: { uid: `${HIDDEN}:0`, cardId: HIDDEN },
      });
    }
  });

  const hand: CardInstance[] = [
    { uid: "kept-1", cardId: "windStep" },
    { uid: "kept-2", cardId: "luckyCharm" },
  ];
  const stolen: CardInstance = { uid: "stolen-1", cardId: "fateRune" };

  it("lays a discarded card face up, but not the hand left behind", () => {
    const events: GameEvent[] = [
      { type: "cardDiscarded", playerId: "scribe", card: { uid: "thrown-1", cardId: "arcaneShield" }, hand },
    ];
    expect(projectEvents(events, "scribe")).toEqual(events);
    const seen = projectEvents(events, "themis");
    expect(json(seen)).toContain("thrown-1");
    expectNoneIn(json(seen), uids(hand));
  });

  it("shows stolen cards to the thief and the robbed, not to the rest", () => {
    const events: GameEvent[] = [
      { type: "cardsStolen", playerId: "warden", from: "scribe", cards: [stolen], discarded: [] },
    ];
    expect(projectEvents(events, "warden")).toEqual(events);
    expect(projectEvents(events, "scribe")).toEqual(events);
    expectNoneIn(json(projectEvents(events, "themis")), ["stolen-1"]);
    expectNoneIn(json(projectEvents(events, null)), ["stolen-1"]);
  });

  it("leaves out the Silent Verdict arming for everyone but Themis", () => {
    const events: GameEvent[] = [
      { type: "abilityReady", playerId: "themis", ability: "silentVerdict" },
      { type: "abilityReady", playerId: "scribe", ability: "forbiddenSeals" },
    ];
    expect(projectEvents(events, "themis")).toEqual(events);
    expect(projectEvents(events, "zarek")).toEqual([events[1]]);
  });

  it("shows which seal the Void took or set down only to Zarek", () => {
    const events: GameEvent[] = [
      { type: "voidSeized", playerId: "zarek", tile: 24, item: { kind: "seal", seal: "ruin" } },
      { type: "voidCast", playerId: "zarek", tile: 30, item: { kind: "seal", seal: "ruin" } },
      { type: "voidEchoed", playerId: "zarek", item: { kind: "seal", seal: "ruin" } },
    ];
    expect(projectEvents(events, "zarek")).toEqual(events);
    for (const viewerId of VIEWERS.filter((id) => id !== "zarek")) {
      expectNoneIn(json(projectEvents(events, viewerId)), ['"ruin"']);
    }
  });
});

describe("a whole match seen from each seat", () => {
  const PLAYERS = [
    { id: "p1", name: "Aria", ability: "forbiddenSeals" as const },
    { id: "p2", name: "Bran", ability: "silentVerdict" as const },
    { id: "p3", name: "Cael", ability: "cardGamble" as const },
  ];

  function nextCommand(state: GameState, step: number): GameCommand {
    if (state.status === "finished") return { type: "restart" };
    const { pendingDiscard } = state;
    if (pendingDiscard) {
      return { type: "discardCard", playerId: pendingDiscard.playerId, cardUid: pendingDiscard.drawn.uid };
    }
    const player = currentPlayer(state);
    return step % 3 === 0 && player.energy >= 5
      ? { type: "sacrificeEnergy", playerId: player.id }
      : { type: "rollDice", playerId: player.id };
  }

  it("never lets a seat see another's hand, any deck, the stream or a hidden trap", () => {
    let state = createGame(POWER_TOURNAMENT_BOARD, PLAYERS, { seed: 99 });
    for (let step = 0; step < 120; step++) {
      let transition;
      try {
        transition = applyCommand(state, nextCommand(state, step));
      } catch {
        transition = applyCommand(state, { type: "rollDice", playerId: currentPlayer(state).id });
      }
      state = transition.state;
      for (const viewerId of [...PLAYERS.map(({ id }) => id), null] as (PlayerId | null)[]) {
        const projected = json(projectState(state, viewerId));
        const others = othersOf(state, viewerId);
        expectNoneIn(
          projected,
          others.flatMap((player) => uids(player.hand)),
        );
        expectNoneIn(
          projected,
          state.players.flatMap((player) => uids(player.deck)),
        );
        expect(JSON.parse(projected).hiddenTraps).toEqual(
          state.hiddenTraps.filter((tile) => state.pinnedTraps.includes(tile)),
        );

        // Cards drawn by someone else stay secret in the events too.
        const drawnByOthers = transition.events.flatMap((event) =>
          event.type === "cardDrawn" && event.playerId !== viewerId ? [event.card.uid] : [],
        );
        expectNoneIn(json(projectEvents(transition.events, viewerId)), drawnByOthers);
      }
    }
  });
});
