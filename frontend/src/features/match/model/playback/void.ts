/** Zarek's Void: swallowing harm, opening rifts, setting spells down and taking them over. */
import { abilityCycle } from "@/game/domain/abilities/charge";
import type { PlayerId, TileId, VoidItem } from "@/game/domain/types";
import { nextFxId, withFx, withPlayer, type MatchView, type TileEffectKind, type VoidRiftView } from "../matchView";
import { playerTileEffect } from "./helpers";
import type { StepHandlers } from "./types";

/** The Void surfaces on `tile`; the banner names what it did, over Zarek. */
function surfaced(
  view: MatchView,
  playerId: PlayerId,
  tile: TileId,
  action: VoidRiftView["action"],
  kind: TileEffectKind,
  item: VoidItem | null,
  doubled?: boolean,
): MatchView {
  return {
    ...withFx(view, { voidRift: { id: nextFxId(view.fx.voidRift), playerId, tile, action } }),
    effect: { ...playerTileEffect(view, playerId, kind), void: { item, doubled } },
  };
}

/** Removes the first held item equal to `item`. */
function released(hold: readonly VoidItem[], item: VoidItem): VoidItem[] {
  const index = hold.findIndex((held) => JSON.stringify(held) === JSON.stringify(item));
  return hold.filter((_, held) => held !== index);
}

export const voidSteps: StepHandlers<
  "voidSwallowed" | "riftOpened" | "voidCast" | "voidSeized" | "voidEchoed" | "voidFed"
> = {
  voidSwallowed: (event, timings) => [
    {
      apply: (view) => {
        const fed = withPlayer(view, event.playerId, (player) => ({ voidHold: [...player.voidHold, event.item] }));
        return surfaced(
          { ...fed, destroyedTraps: [...fed.destroyedTraps, event.tile] },
          event.playerId,
          event.tile,
          "swallow",
          "voidSwallowed",
          event.item,
        );
      },
      durationMs: timings.voidRiftMs,
    },
  ],
  riftOpened: (event, timings) => {
    const { rift } = event;
    return [
      {
        apply: (view) => {
          // The held harm leaves the Void: rifts only open from harms, the first matching one goes.
          const opened = withPlayer(view, event.playerId, (player) => {
            const index = player.voidHold.findIndex((held) => held.kind === riftKind(rift.effect.kind));
            return { voidHold: player.voidHold.filter((_, held) => held !== index) };
          });
          return surfaced(
            { ...opened, rifts: [...opened.rifts, rift] },
            event.playerId,
            rift.id,
            "open",
            "riftOpened",
            null,
            rift.rift?.doubled,
          );
        },
        durationMs: timings.voidRiftMs,
      },
    ];
  },
  voidCast: (event, timings) => [
    {
      apply: (view) => {
        const cast = withPlayer(view, event.playerId, (player) => ({
          voidHold: released(player.voidHold, event.item),
        }));
        return surfaced(
          withSpell(cast, event.playerId, event.tile, event.item),
          event.playerId,
          event.tile,
          "cast",
          "voidCast",
          event.item,
        );
      },
      durationMs: timings.voidRiftMs,
    },
  ],
  voidSeized: (event, timings) => [
    {
      apply: (view) => {
        const seized = withPlayer(view, event.playerId, () => ({ voidIdle: 0 }));
        return surfaced(
          stolen(seized, event.playerId, event.tile),
          event.playerId,
          event.tile,
          "seize",
          "voidSeized",
          event.item,
        );
      },
      durationMs: timings.voidRiftMs,
    },
  ],
  voidEchoed: (event, timings) => [
    {
      apply: (view) => {
        const echoed = withPlayer(view, event.playerId, (player) => ({
          voidHold: [...player.voidHold, event.item],
          voidIdle: 0,
        }));
        const tile = view.players.find((player) => player.id === event.playerId)?.position ?? 0;
        return surfaced(echoed, event.playerId, tile, "seize", "voidEchoed", event.item);
      },
      durationMs: timings.voidRiftMs,
    },
  ],
  // Quietly: the bar fills, the Void stirs.
  voidFed: (event) => [
    {
      apply: (view) =>
        withPlayer(view, event.playerId, (player) => ({
          abilityCharge: Math.min(abilityCycle(player.ability), player.abilityCharge + event.charge),
        })),
      durationMs: 0,
    },
  ],
};

function riftKind(kind: string): VoidItem["kind"] {
  return kind === "trap" || kind === "curse" ? kind : "skipTurn";
}

function withSpell(view: MatchView, owner: PlayerId, tile: TileId, item: VoidItem): MatchView {
  switch (item.kind) {
    case "flame":
      return { ...view, blackFlames: [...view.blackFlames, { tile, owner, turnsLeft: 0, hits: 0 }] };
    case "snow":
      return { ...view, enchantedTiles: [...view.enchantedTiles, { tile, owner }] };
    case "seal":
      return { ...view, seals: [...view.seals, { tile, owner, kind: item.seal }] };
    case "specter":
      return { ...view, specters: [...view.specters, { tile, owner, kind: item.specter }] };
    default:
      return view;
  }
}

/** Mirrors void.ts stealSpell: the spell stays put under a new owner, the fairy's ice becomes snow. */
function stolen(view: MatchView, owner: PlayerId, tile: TileId): MatchView {
  const take = <T extends { tile: TileId; owner: PlayerId }>(list: readonly T[]) =>
    list.map((entry) => (entry.tile === tile ? { ...entry, owner } : entry));
  const iced = view.winter?.iced.includes(tile) && !view.enchantedTiles.some((entry) => entry.tile === tile);
  return {
    ...view,
    blackFlames: take(view.blackFlames),
    enchantedTiles: iced ? [...view.enchantedTiles, { tile, owner }] : take(view.enchantedTiles),
    seals: take(view.seals),
    specters: take(view.specters),
    winter: view.winter && { ...view.winter, iced: view.winter.iced.filter((entry) => entry !== tile) },
  };
}
