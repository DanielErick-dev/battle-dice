import {
  abilityCycle,
  FLAME_TURNS,
  isReactive,
  LEVITATION_TURNS,
  SILENCE_TURNS,
  type AbilityId,
} from "@/game/domain/abilities";
import { blessingTurns } from "@/game/domain/blessings";
import { cardCost, MAX_ENERGY } from "@/game/domain/cards";
import { throwOnPile } from "@/game/domain/deck";
import { SEAL_KINDS } from "@/game/domain/seals";
import { SPECTER_KINDS } from "@/game/domain/specters";
import { DICE_SIDES } from "@/game/domain/dice";
import { currentPlayer } from "@/game/domain/engine";
import type { GameEvent } from "@/game/domain/events";
import type { GameState, PlayerId, TileId } from "@/game/domain/types";
import type { PlaybackTimings } from "../config";
import { sealViews, specterViews, withPlayer, withPlayerAt, type MatchView, type TileEffectView } from "./matchView";

export interface PlaybackStep {
  apply: (view: MatchView) => MatchView;
  durationMs: number;
}

export function eventToSteps(event: GameEvent, timings: PlaybackTimings): PlaybackStep[] {
  switch (event.type) {
    case "diceRolled":
      return [
        {
          apply: (view) => ({
            ...view,
            isRolling: true,
            lastRoll: null,
            roll: { id: (view.roll?.id ?? 0) + 1, dice: event.dice },
            poweredPlayerId: event.dice.includes(DICE_SIDES) ? event.playerId : null,
            effect: null,
            movingPlayerId: event.playerId,
          }),
          durationMs: timings.diceRollMs,
        },
        {
          apply: (view) => ({
            ...view,
            isRolling: false,
            lastRoll: {
              dice: event.dice,
              best: event.best ?? false,
              bonus: event.bonus ?? 0,
              multiplier: event.multiplier ?? 1,
              total: event.value,
            },
          }),
          durationMs: timings.diceRevealMs,
        },
      ];

    case "playerMoved": {
      // The Berserker runs on from where he shoved someone.
      const steps = event.path.map((tile) => ({
        apply: (view: MatchView) => ({
          ...withPlayerAt(view, event.playerId, tile),
          trample: view.trample?.by === event.playerId ? null : view.trample,
        }),
        durationMs: event.dash ? timings.dashStepMs : timings.stepMs,
      }));
      if (!event.dash) return steps;
      // Dormant Fury: the player throws themselves forward, lightning takes them, they cross the path as a
      // blur, then it lets go.
      return [
        {
          apply: (view) => {
            const from = view.players.find((player) => player.id === event.playerId)?.position;
            const path = from === undefined ? event.path : [from, ...event.path];
            return {
              ...view,
              dash: { id: (view.dash?.id ?? 0) + 1, playerId: event.playerId, path, arrived: false },
            };
          },
          durationMs: timings.dashLaunchMs + timings.dashStrikeMs,
        },
        ...steps,
        {
          apply: (view) => (view.dash ? { ...view, dash: { ...view.dash, arrived: true } } : view),
          durationMs: timings.dashArriveMs,
        },
      ];
    }

    case "realmEntered":
      // The gate opens (tunnel of fire or pillar of light), then the player is carried in.
      return [
        {
          apply: (view) => ({
            ...view,
            effect: {
              kind: "realmEnter",
              playerId: event.playerId,
              from: event.from,
              to: event.to,
              realm: event.realm,
            },
          }),
          durationMs: timings.realmGateMs,
        },
        {
          apply: (view) => withPlayerAt(view, event.playerId, event.to),
          durationMs: timings.effectTravelMs,
        },
      ];

    case "blessingReceived":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) =>
              event.blessing === "shield"
                ? { shielded: true }
                : event.blessing === "charge"
                  ? {
                      abilityCharge: player.abilityCharge + (event.charged ? 1 : 0),
                    }
                  : event.blessing === "energy"
                    ? { energy: player.energy + event.energyGained }
                    : {
                        blessings: [
                          ...player.blessings.filter((blessing) => blessing.kind !== event.blessing),
                          {
                            kind: event.blessing,
                            turnsLeft: blessingTurns(player),
                            fresh: true,
                          },
                        ],
                      },
            ),
            effect: {
              kind: "blessing",
              playerId: event.playerId,
              from: event.tile,
              to: event.tile,
              blessing: {
                kind: event.blessing,
                energyGained: event.energyGained,
                charged: event.charged,
                turns: blessingTurnsOf(view, event.playerId),
              },
            },
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "portalEntered":
    case "trapTriggered": {
      const kind = event.type === "portalEntered" ? "portal" : "trap";
      return [
        {
          apply: (view) => ({ ...view, effect: { kind, ...event } }),
          durationMs: timings.effectWarmupMs,
        },
        {
          apply: (view) => withPlayerAt(view, event.playerId, event.to),
          durationMs: timings.effectTravelMs,
        },
      ];
    }

    case "advanceTriggered":
      // The walk itself comes as the next playerMoved event.
      return [
        {
          apply: (view) => ({ ...view, effect: { kind: "advance", ...event }, poweredPlayerId: event.playerId }),
          durationMs: timings.effectWarmupMs,
        },
      ];

    case "extraTurnGranted":
      return [
        {
          apply: (view) => ({ ...view, effect: { kind: "extraTurn", ...tileOf(event) } }),
          durationMs: timings.noticeMs,
        },
      ];

    case "skipTurnGained":
      // Counted at once, so the player sits down to wait while still in view.
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({ skipTurns: player.skipTurns + 1 })),
            effect: { kind: "skipTurn", ...tileOf(event) },
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "turnSkipped":
      return [
        {
          apply: (view) => {
            const tile = view.players.find((player) => player.id === event.playerId)?.position ?? 0;
            return {
              ...view,
              effect: {
                kind: "turnSkipped",
                playerId: event.playerId,
                from: tile,
                to: tile,
              },
            };
          },
          durationMs: timings.noticeMs,
        },
      ];

    // The snow drinks from its prisoner, and loosens its grip a round.
    case "snowDrained":
      return [
        {
          apply: (view) => {
            const drained = withPlayer(view, event.playerId, (player) => ({
              energy: player.energy - event.energy,
              snowbound:
                player.snowbound && player.snowbound.rounds > 1
                  ? { ...player.snowbound, rounds: player.snowbound.rounds - 1 }
                  : null,
            }));
            return withPlayer(drained, event.owner, (owner) => ({
              energy: Math.min(MAX_ENERGY, owner.energy + event.energy),
            }));
          },
          durationMs: timings.noticeMs,
        },
      ];

    case "cardTeleported":
      return [
        {
          apply: (view) => ({ ...view, effect: { kind: "teleport", ...event } }),
          durationMs: timings.effectWarmupMs,
        },
        {
          apply: (view) => withPlayerAt(view, event.playerId, event.to),
          durationMs: timings.effectTravelMs,
        },
      ];

    case "trapCursed":
      return [
        {
          apply: (view) => {
            const withLoss = withPlayer(view, event.playerId, (player) => ({
              hand: player.hand.filter((card) => card.uid !== event.card?.uid),
              discard: event.card ? [...player.discard, event.card] : player.discard,
              energy: player.energy - event.energyLost,
            }));
            const tile = withLoss.players.find((player) => player.id === event.playerId)?.position ?? 0;
            const curse = { kind: event.curse, card: event.card, energyLost: event.energyLost };
            return {
              ...withLoss,
              effect: { kind: "trapCurse", playerId: event.playerId, from: tile, to: tile, curse },
            };
          },
          durationMs: timings.noticeMs,
        },
      ];

    case "trapBlocked": {
      const effect: TileEffectView = {
        kind: "trapBlocked",
        playerId: event.playerId,
        from: event.tile,
        to: event.tile,
        ward: { kind: event.ward, hidden: event.hidden },
      };
      return [
        {
          apply: (view) => ({
            ...(event.ward === "shield" ? withPlayer(view, event.playerId, () => ({ shielded: false })) : view),
            effect,
          }),
          durationMs: timings.noticeMs,
        },
      ];
    }

    case "hiddenTrapSprung":
      // The trap shows itself on the tile, then throws the player back.
      return [
        {
          apply: (view) => ({
            ...view,
            effect: { kind: "hiddenTrap", playerId: event.playerId, from: event.tile, to: event.to },
          }),
          durationMs: timings.hiddenTrapRevealMs,
        },
        {
          apply: (view) => withPlayerAt(view, event.playerId, event.to),
          durationMs: timings.effectTravelMs,
        },
      ];

    case "abilityReady":
      return [
        {
          apply: (view) => {
            const charged = withPlayer(view, event.playerId, () => ({ abilityCharge: abilityCycle(event.ability) }));
            return { ...charged, effect: abilityEffect(charged, event.playerId, "abilityReady", event.ability) };
          },
          durationMs: timings.noticeMs,
        },
      ];

    case "abilityUsed":
      return [
        {
          apply: (view) => {
            const spent = withPlayer(view, event.playerId, (player) => ({
              abilityCharge: 0,
              levitating: event.ability === "levitation" ? LEVITATION_TURNS : player.levitating,
            }));
            return {
              ...spent,
              // A reactive ability does its work at once; the others last for the turn.
              abilityInUse: isReactive(event.ability) ? view.abilityInUse : event.ability,
              effect: abilityEffect(spent, event.playerId, "abilityUsed", event.ability),
            };
          },
          durationMs: abilityUsedMs(event.ability, timings),
        },
      ];

    case "boardCleansed":
      // The wave rolls over the tiles ahead, then what it washed away is gone.
      return [
        {
          apply: (view) => ({
            ...view,
            tide: {
              id: (view.tide?.id ?? 0) + 1,
              playerId: event.playerId,
              path: event.reach,
              rolling: true,
            },
          }),
          durationMs: timings.tideMs,
        },
        {
          apply: (view) => ({
            ...view,
            blackFlames: view.blackFlames.filter((flame) => !event.tiles.includes(flame.tile)),
            enchantedTiles: view.enchantedTiles.filter((enchanted) => !event.tiles.includes(enchanted.tile)),
            specters: view.specters.filter((specter) => !event.tiles.includes(specter.tile)),
            seals: view.seals.filter((seal) => !event.tiles.includes(seal.tile)),
            pinnedTraps: view.pinnedTraps.filter((tile) => !event.tiles.includes(tile)),
            tide: view.tide && { ...view.tide, rolling: false },
            effect: {
              ...playerTileEffect(view, event.playerId, "cleansed"),
              count: event.tiles.length,
            },
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "timeBent":
      // Shown over the opponent whose time was bent.
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.targetId, (player) =>
              event.power === "halt"
                ? { skipTurns: player.skipTurns + event.rounds }
                : { reversedRolls: player.reversedRolls + event.rounds },
            ),
            effect: { ...playerTileEffect(view, event.targetId, "timeBent"), time: event.power, count: event.rounds },
          }),
          durationMs: timings.timeBentMs,
        },
      ];

    case "abilityBlocked":
    case "cardBlocked": {
      // Shown over whoever threw it: the opponent turned it away, and it's spent.
      return [
        {
          apply: (view) => ({
            ...view,
            effect: {
              ...playerTileEffect(view, event.playerId, "abilityBlocked"),
              blocked: {
                ...(event.type === "abilityBlocked" ? { ability: event.ability } : { cardId: event.cardId }),
                ward: event.ward,
                targetName: view.players.find((player) => player.id === event.targetId)?.name ?? "",
              },
            },
          }),
          durationMs: timings.noticeMs,
        },
      ];
    }

    case "untamedUnleashed":
      return [
        {
          apply: (view) =>
            withPlayer(view, event.playerId, () => ({
              untamed: event.turns,
              reversedRolls: 0,
            })),
          durationMs: 0,
        },
      ];

    case "playerTrampled": {
      // The Berserker turns on them and shoves; they fly back to where the knock-back leaves them,
      // and he turns back to run on.
      const trample = {
        by: event.by,
        victim: event.playerId,
        tile: event.tile,
      };
      // Caught sitting out a lost turn on their chair, they get up first.
      const getUp = {
        apply: (view: MatchView) => ({
          ...view,
          trample: { id: (view.trample?.id ?? 0) + 1, ...trample, phase: "rise" as const },
        }),
        durationMs: timings.trampleRiseMs,
      };
      return [
        ...(event.seated ? [getUp] : []),
        {
          apply: (view) => ({
            ...view,
            trample: {
              id: view.trample?.phase === "rise" ? view.trample.id : (view.trample?.id ?? 0) + 1,
              ...trample,
              phase: "shove",
            },
          }),
          durationMs: timings.trampleShoveMs,
        },
        {
          apply: (view) => ({
            ...withPlayerAt(view, event.playerId, event.path.at(-1) ?? event.tile),
            trample: view.trample && { ...view.trample, phase: "flying" },
            effect: {
              ...playerTileEffect(view, event.playerId, "trampled"),
              count: event.path.length,
            },
          }),
          durationMs: timings.trampleFlightMs,
        },
        {
          apply: (view) => ({
            ...view,
            trample: view.trample && { ...view.trample, phase: "over" },
          }),
          durationMs: timings.trampleRecoverMs,
        },
      ];
    }

    case "susanooRepelled":
      // They reach her tile and the Susanoo throws them back; they get up there.
      return [
        {
          apply: (view) => ({
            ...withPlayerAt(view, event.playerId, event.to),
            trample: {
              id: (view.trample?.id ?? 0) + 1,
              by: event.by,
              victim: event.playerId,
              tile: event.tile,
              phase: "flying",
              susanoo: true,
            },
            effect: { kind: "repelled", playerId: event.playerId, from: event.tile, to: event.to },
          }),
          durationMs: timings.trampleFlightMs,
        },
        {
          apply: (view) => ({ ...view, trample: view.trample && { ...view.trample, phase: "over" } }),
          durationMs: timings.trampleRecoverMs,
        },
      ];

    case "arrowsLoosed":
      // Up into the sky, down on the targets; pinned tiles keep their arrows once they hit.
      return [
        {
          apply: (view) => ({
            ...view,
            volley: {
              id: (view.volley?.id ?? 0) + 1,
              playerId: event.playerId,
              from: view.players.find((player) => player.id === event.playerId)?.position ?? 0,
              targets: event.targets,
            },
          }),
          durationMs: timings.arrowVolleyMs,
        },
        {
          apply: (view) => ({ ...view, pinnedTraps: [...view.pinnedTraps, ...event.pinned] }),
          durationMs: timings.arrowImpactMs,
        },
      ];

    case "gambleRolled":
      // The die of fortune is thrown like a move's, then the verdict shows over the player.
      return [
        {
          apply: (view) => ({
            ...view,
            isRolling: true,
            roll: { id: (view.roll?.id ?? 0) + 1, dice: [event.value] },
            effect: null,
          }),
          durationMs: timings.diceRollMs,
        },
        {
          apply: (view) => {
            const tile = view.players.find((player) => player.id === event.playerId)?.position ?? 0;
            const gamble = {
              value: event.value,
              won: event.won,
              fortune: event.fortune,
            };
            return {
              ...view,
              isRolling: false,
              effect: { kind: "gamble", playerId: event.playerId, from: tile, to: tile, gamble },
            };
          },
          durationMs: timings.noticeMs,
        },
      ];

    case "cardsStolen":
      // Each card is shown as it's taken, then lands in the taker's hand (or discard pile, when full).
      return event.cards.flatMap((card) => {
        const kept = !event.discarded.some((discarded) => discarded.uid === card.uid);
        return [
          {
            apply: (view: MatchView) => ({
              ...withPlayer(view, event.from, (player) => ({
                hand: player.hand.filter((held) => held.uid !== card.uid),
              })),
              drawing: {
                id: (view.drawing?.id ?? 0) + 1,
                playerId: event.playerId,
                card,
                takenFrom: view.players.find((player) => player.id === event.from)?.name,
              },
            }),
            durationMs: timings.drawRevealMs,
          },
          {
            apply: (view: MatchView) => ({
              ...withPlayer(view, event.playerId, (player) =>
                kept ? { hand: [...player.hand, card] } : { discard: throwOnPile(player.discard, [card]) },
              ),
              drawing: null,
              lastDrawnUid: kept ? card.uid : view.lastDrawnUid,
            }),
            durationMs: timings.drawMs,
          },
        ];
      });

    case "spectersSummoned":
      // The apparitions rise from the floor, beside any summoned before.
      return [
        {
          apply: (view) => ({
            ...view,
            specters: [
              ...view.specters,
              ...event.tiles.map((tile, index) => ({ tile, owner: event.playerId, kind: SPECTER_KINDS[index] })),
            ],
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "specterStruck":
      // The apparition lunges and fades; Hunger's energy changes hands.
      return [
        {
          apply: (view) => {
            const drained = withPlayer(view, event.playerId, (player) => ({
              energy: event.owner === event.playerId ? player.energy : player.energy - event.energyTaken,
            }));
            const fed = withPlayer(drained, event.owner, (player) => ({
              energy: player.energy + event.energyGained,
              abilityCharge: player.abilityCharge + event.chargeGained,
            }));
            return {
              ...fed,
              specters: view.specters.filter((specter) => specter.tile !== event.tile),
              effect: {
                kind: "specter",
                playerId: event.playerId,
                from: event.tile,
                to: event.tile,
                specter: {
                  kind: event.kind,
                  owner: event.owner,
                  energyTaken: event.energyTaken,
                  energyGained: event.energyGained,
                  chargeGained: event.chargeGained,
                },
              },
            };
          },
          durationMs: timings.noticeMs,
        },
      ];

    case "spectersDispelled":
      return [
        {
          apply: (view) => {
            const tile = view.players.find((player) => player.id === event.owner)?.position ?? 0;
            return {
              ...view,
              specters: view.specters.filter((specter) => specter.owner !== event.owner),
              effect: {
                kind: "specter",
                playerId: event.playerId,
                from: tile,
                to: tile,
                specter: { kind: null, owner: event.owner, energyTaken: 0, energyGained: 0, chargeGained: 0 },
              },
            };
          },
          durationMs: timings.noticeMs,
        },
      ];

    case "plunderOffered":
      // The Warden's pick comes with the final sync (pendingPlunder); nothing to show meanwhile.
      return [];

    case "sealsWritten":
      // The scrolls appear on their tiles, beside any written before.
      return [
        {
          apply: (view) => ({
            ...view,
            seals: [
              ...view.seals,
              ...event.tiles.map((tile, index) => ({ tile, owner: event.playerId, kind: SEAL_KINDS[index] })),
            ],
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "sealBroken":
      // The scroll bursts open, showing which seal it was; the Pact's energy changes hands.
      return [
        {
          apply: (view) => {
            const drained = withPlayer(view, event.playerId, (player) => ({
              energy: player.energy - event.energyLost,
              silencedTurns:
                event.kind === "silence" && event.owner !== event.playerId ? SILENCE_TURNS : player.silencedTurns,
            }));
            const paid = withPlayer(drained, event.owner, (player) => ({ energy: player.energy + event.energyGained }));
            return {
              ...paid,
              seals: view.seals.filter((seal) => seal.tile !== event.tile),
              effect: {
                kind: "seal",
                playerId: event.playerId,
                from: event.tile,
                to: event.tile,
                seal: {
                  kind: event.kind,
                  owner: event.owner,
                  energyLost: event.energyLost,
                  energyGained: event.energyGained,
                },
              },
            };
          },
          durationMs: timings.noticeMs,
        },
      ];

    case "cardsResurrected":
      // Each card rises from the discard pile: shown in the middle of the screen, then into the hand.
      return event.cards.flatMap((card) => [
        {
          apply: (view: MatchView) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              discard: player.discard.filter((discarded) => discarded.uid !== card.uid),
            })),
            drawing: { id: (view.drawing?.id ?? 0) + 1, playerId: event.playerId, card },
          }),
          durationMs: timings.drawRevealMs,
        },
        {
          apply: (view: MatchView) => ({
            ...withPlayer(view, event.playerId, (player) => ({ hand: [...player.hand, card] })),
            drawing: null,
            lastDrawnUid: card.uid,
          }),
          durationMs: timings.drawMs,
        },
      ]);

    case "trapUnpinned":
      return [
        {
          apply: (view) => ({ ...view, pinnedTraps: view.pinnedTraps.filter((tile) => tile !== event.tile) }),
          durationMs: 0,
        },
      ];

    case "tilesEnchanted": {
      // Snow streams from her wand to each harmful tile ahead in turn (the camera following it),
      // and the tile blooms, enchanted for good, as it lands; then back to her.
      const landed = (view: MatchView, index: number): MatchView =>
        index < 0
          ? view
          : { ...view, enchantedTiles: [...view.enchantedTiles, { tile: event.tiles[index], owner: event.playerId }] };
      return [
        ...event.tiles.map((tile, index) => ({
          apply: (view: MatchView) => ({
            ...landed(view, index - 1),
            frostStream: { id: (view.frostStream?.id ?? 0) + 1, playerId: event.playerId, tile },
          }),
          durationMs: timings.frostStreamMs,
        })),
        {
          apply: (view: MatchView) => ({ ...landed(view, event.tiles.length - 1), frostStream: null }),
          durationMs: timings.noticeMs,
        },
      ];
    }

    case "winterBegan":
      return [
        {
          apply: (view) => ({
            ...view,
            winter: {
              owner: event.playerId,
              frontier: view.winter?.frontier ?? 1,
            },
            effect: playerTileEffect(view, event.playerId, "winter"),
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "winterSpread":
      // The ice creeps on along the path.
      return [
        {
          apply: (view) => ({
            ...view,
            winter: { owner: event.owner, frontier: event.to },
          }),
          durationMs: 0,
        },
      ];

    case "enchantmentStirred":
      return [
        {
          apply: (view) => {
            const frozen = withPlayer(view, event.playerId, (player) => ({
              skipTurns: player.skipTurns + event.frozen,
              ...(event.frozen > 0 && {
                snowbound: {
                  owner: event.owner,
                  rounds: Math.max(event.frozen, player.snowbound?.rounds ?? 0),
                },
              }),
            }));
            const paid = withPlayer(frozen, event.owner, (player) => ({
              abilityCharge: player.abilityCharge + (event.charged ? 1 : 0),
            }));
            return {
              ...paid,
              effect: {
                kind: "enchanted",
                playerId: event.playerId,
                from: event.tile,
                to: event.tile,
                enchanted: { owner: event.owner, frozen: event.frozen },
              },
            };
          },
          // On her own snow the fairy hops before it carries her on.
          durationMs: event.playerId === event.owner ? timings.snowHopMs : timings.noticeMs,
        },
      ];

    case "flamesLit":
      return [
        {
          apply: (view) => ({
            ...view,
            blackFlames: [
              ...view.blackFlames,
              ...event.tiles.map((tile) => ({ tile, owner: event.playerId, turnsLeft: FLAME_TURNS, hits: 0 })),
            ],
            // The fairy's snow under the fire melts.
            enchantedTiles: view.enchantedTiles.filter((enchanted) => !event.tiles.includes(enchanted.tile)),
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "flamesScorched":
      return [
        {
          apply: (view) => ({
            ...withPlayer(
              withPlayer(view, event.playerId, (player) => ({ energy: player.energy - event.energyLost })),
              event.owner,
              (player) => ({ abilityCharge: player.abilityCharge + (event.charged ? 1 : 0) }),
            ),
            effect: {
              kind: "flames",
              playerId: event.playerId,
              from: event.tile,
              to: event.tile,
              flames: { energyLost: event.energyLost },
            },
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "flamesFaded":
      return [
        {
          apply: (view) => ({
            ...view,
            blackFlames: view.blackFlames.filter(
              (flame) => flame.owner !== event.owner || !event.tiles.includes(flame.tile),
            ),
          }),
          durationMs: 0,
        },
      ];

    case "armourRaised":
      return [
        {
          apply: (view) => withPlayer(view, event.playerId, () => ({ spectralArmour: event.turns })),
          durationMs: timings.noticeMs,
        },
      ];

    case "armourHeld":
      // Untamed, it's not armour that turned it away: the Berserker just shrugs it off.
      return [
        {
          apply: (view) => ({
            ...view,
            effect: view.players.some((player) => player.id === event.playerId && player.untamed > 0)
              ? {
                  kind: "trapBlocked",
                  playerId: event.playerId,
                  from: event.tile,
                  to: event.tile,
                  ward: { kind: "untamed", hidden: false },
                }
              : {
                  kind: "armour",
                  playerId: event.playerId,
                  from: event.tile,
                  to: event.tile,
                },
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "levitatedOver":
      return [
        {
          apply: (view) => ({
            ...view,
            effect: { kind: "levitated", playerId: event.playerId, from: event.tile, to: event.tile },
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "seraphFell":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, () => ({
              ability: "hellsDrag",
              blessings: [],
              crown: "infernal",
            })),
            effect: {
              ...playerTileEffect(view, event.playerId, "fallen"),
              crown: "infernal",
            },
          }),
          durationMs: timings.fallMs,
        },
      ];

    case "crownGained":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, () => ({ crown: event.crown })),
            effect: {
              ...playerTileEffect(view, event.playerId, "crown"),
              crown: event.crown,
            },
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "heavenBarred":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              skipTurns: player.skipTurns + event.rounds,
              chained: player.chained + event.rounds,
            })),
            effect: {
              kind: "heavenBarred",
              playerId: event.playerId,
              from: event.tile,
              to: event.tile,
            },
          }),
          durationMs: timings.noticeMs,
        },
      ];

    case "graceOffered":
      return [
        {
          apply: (view) => ({
            ...view,
            pendingGrace: {
              playerId: event.playerId,
              tile: event.tile,
              offer: event.offer,
            },
          }),
          durationMs: 0,
        },
      ];

    case "hellDragged": {
      // The hand rises under the victim and closes on them, sinks back with them, and they're in hell.
      const drag = (view: MatchView, phase: "grab" | "sink" | "over") => ({
        id: phase === "grab" ? (view.drag?.id ?? 0) + 1 : (view.drag?.id ?? 1),
        playerId: event.playerId,
        targetId: event.targetId,
        from: event.from,
        phase,
      });
      return [
        {
          apply: (view) => ({ ...view, drag: drag(view, "grab") }),
          durationMs: timings.dragGrabMs,
        },
        {
          apply: (view) => ({ ...view, drag: drag(view, "sink") }),
          durationMs: timings.dragSinkMs,
        },
        {
          apply: (view) => {
            const moved = withPlayer(view, event.targetId, () => ({
              position: event.to,
            }));
            return {
              ...moved,
              drag: drag(view, "over"),
              effect: {
                kind: "dragged",
                playerId: event.targetId,
                from: event.from,
                to: event.to,
              },
            };
          },
          durationMs: timings.noticeMs,
        },
      ];
    }

    case "wardOffered":
      return [
        {
          apply: (view) => ({
            ...view,
            pendingWard: { playerId: event.playerId, tile: event.tile, threat: event.threat },
          }),
          durationMs: 0,
        },
      ];

    case "playerPushed":
      return event.path.map((tile) => ({
        apply: (view) => withPlayerAt(view, event.playerId, tile),
        durationMs: timings.pushStepMs,
      }));

    // The three copies leave the hand, and the fused card is shown off as it joins it.
    case "cardsFused":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              hand: player.hand.filter((card) => !event.used.includes(card.uid)),
            })),
            fusing: {
              id: (view.fusing?.id ?? 0) + 1,
              playerId: event.playerId,
              card: event.card,
            },
          }),
          durationMs: timings.fusionMs,
        },
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              hand: [...player.hand, event.card],
            })),
            fusing: null,
            lastDrawnUid: event.card.uid,
          }),
          durationMs: timings.drawMs,
        },
      ];

    case "cardDrawn":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              deck: player.deck.filter((card) => card.uid !== event.card.uid),
            })),
            drawing: { id: (view.drawing?.id ?? 0) + 1, playerId: event.playerId, card: event.card },
          }),
          durationMs: timings.drawRevealMs,
        },
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({ hand: [...player.hand, event.card] })),
            drawing: null,
            lastDrawnUid: event.card.uid,
          }),
          durationMs: timings.drawMs,
        },
      ];

    case "cardTransmuted":
      // The old card shows, dissolves in alchemical fire into the new one, which then flies to the hand.
      return [
        {
          apply: (view) => ({
            ...view,
            transmuting: {
              id: (view.transmuting?.id ?? 0) + 1,
              playerId: event.playerId,
              from: event.from,
              sacrificed: event.sacrificed,
              to: event.to,
            },
          }),
          durationMs: timings.transmuteMs,
        },
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              hand: player.hand
                .filter((card) => card.uid !== event.sacrificed.uid)
                .map((card) => (card.uid === event.from.uid ? event.to : card)),
            })),
            transmuting: null,
            lastDrawnUid: event.to.uid,
          }),
          durationMs: timings.drawMs,
        },
      ];

    case "deckReshuffled":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({ deck: player.discard, discard: [] })),
          }),
          durationMs: timings.drawMs,
        },
      ];

    case "discardRequired":
      return [
        {
          apply: (view) => ({
            ...view,
            drawing: { id: (view.drawing?.id ?? 0) + 1, playerId: event.playerId, card: event.card },
          }),
          durationMs: timings.drawRevealMs,
        },
        {
          apply: (view) => ({
            ...view,
            drawing: null,
            pendingDiscard: { playerId: event.playerId, drawn: event.card },
          }),
          durationMs: 0,
        },
      ];

    case "cardDiscarded":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              hand: event.hand,
              discard: throwOnPile(player.discard, [event.card]),
            })),
            pendingDiscard: null,
          }),
          durationMs: timings.drawMs / 2,
        },
      ];

    case "cardPlayed":
      return [
        {
          apply: (view) => ({
            ...withPlayer(view, event.playerId, (player) => ({
              hand: player.hand.filter((card) => card.uid !== event.card.uid),
              discard: throwOnPile(player.discard, [event.card]),
              energy: player.energy - cardCost(event.card.cardId),
            })),
            cast: { id: (view.cast?.id ?? 0) + 1, ...event },
            cardsPlayedThisTurn: view.cardsPlayedThisTurn + 1,
            effect: null,
          }),
          durationMs: timings.castMs,
        },
      ];

    case "playerWon":
      return [{ apply: (view) => ({ ...view, winnerId: event.playerId }), durationMs: 0 }];

    case "turnChanged":
      // A beat on where the turn left things (a knock-back's last tile) before the camera moves on.
      return [
        { apply: (view) => view, durationMs: timings.turnHandoffMs },
        { apply: (view) => ({ ...view, activePlayerId: event.playerId }), durationMs: 0 },
      ];

    // Silent: the tile turns to rubble as the blades strike.
    case "trapDestroyed":
      return [
        {
          apply: (view) => ({ ...view, destroyedTraps: [...view.destroyedTraps, event.tile] }),
          durationMs: 0,
        },
      ];

    case "gameRestarted":
      return [
        {
          apply: (view) => ({
            ...view,
            lastRoll: null,
            effect: null,
            winnerId: null,
            cast: null,
            drawing: null,
            transmuting: null,
            lastDrawnUid: null,
            pendingDiscard: null,
            destroyedTraps: [],
            pinnedTraps: [],
            seals: [],
            specters: [],
            enchantedTiles: [],
            blackFlames: [],
            winter: null,
            frostStream: null,
            volley: null,
            tide: null,
            drag: null,
          }),
          durationMs: 0,
        },
      ];
  }
}

/** Final step of every update: snaps the view onto the authoritative state. */
export function syncStep(state: GameState): PlaybackStep {
  return {
    apply: (view) => ({
      ...view,
      players: state.players,
      activePlayerId: currentPlayer(state).id,
      winnerId: state.winnerId,
      movingPlayerId: null,
      poweredPlayerId: null,
      pendingDiscard: state.pendingDiscard,
      cardsPlayedThisTurn: state.cardsPlayedThisTurn,
      abilityInUse: state.abilityInUse,
      pendingWard: state.pendingWard,
      pendingGrace: state.pendingGrace,
      destroyedTraps: state.destroyedTraps,
      pinnedTraps: state.pinnedTraps,
      seals: sealViews(state),
      specters: specterViews(state),
      enchantedTiles: state.enchantedTiles,
      blackFlames: state.blackFlames,
      winter: state.winter,
      pendingPlunder: state.pendingPlunder,
    }),
    durationMs: 0,
  };
}

/**
 * How long an ability's use holds the playback: Transmutation's throw and smoke play out before
 * its card changes; Arrow Rain's archer only aims before the volley (its own event) flies.
 */
function abilityUsedMs(ability: AbilityId, timings: PlaybackTimings): number {
  if (ability === "transmutation") return timings.transmuteThrowMs;
  if (ability === "arrowRain") return timings.arrowAimMs;
  if (ability === "untamed") return timings.untamedCastMs;
  if (ability === "hellsDrag") return timings.dragCastMs;
  if (ability === "fairyBloom") return timings.frostAimMs;
  return timings.noticeMs;
}

/** Rounds a blessing lasts on the player (Seraphiel's last longer). */
function blessingTurnsOf(view: MatchView, playerId: PlayerId): number | undefined {
  const player = view.players.find((candidate) => candidate.id === playerId);
  return player && blessingTurns(player);
}

/** An ability notice over the player's tile. */
function abilityEffect(
  view: MatchView,
  playerId: PlayerId,
  kind: "abilityReady" | "abilityUsed",
  id: AbilityId,
): TileEffectView {
  return { ...playerTileEffect(view, playerId, kind), ability: { id } };
}

/** Where a notice about a player on a tile shows. */
function tileOf(event: { playerId: PlayerId; tile: TileId }) {
  return { playerId: event.playerId, from: event.tile, to: event.tile };
}

/** An effect shown over the tile the player stands on. */
function playerTileEffect(view: MatchView, playerId: PlayerId, kind: TileEffectView["kind"]): TileEffectView {
  const tile = view.players.find((player) => player.id === playerId)?.position ?? 0;
  return { kind, playerId, from: tile, to: tile };
}
