import type { GameEvent } from "../core/events";
import type { PlayerId } from "../core/ids";

/** What one player did over a match, counted from its events (a projected log counts the same). */
export interface PlayerStats {
  rolls: number;
  biggestRoll: number;
  tilesWalked: number;
  trapsHit: number;
  tilesPushedBack: number;
  cardsPlayed: number;
  cardsStolen: number;
  cardsLost: number;
  abilitiesUsed: number;
  turnsLost: number;
  /** Cards and abilities others aimed at them that a ward turned away. */
  attacksShrugged: number;
}

export type MatchStats = Readonly<Record<PlayerId, PlayerStats>>;

const EMPTY: PlayerStats = {
  rolls: 0,
  biggestRoll: 0,
  tilesWalked: 0,
  trapsHit: 0,
  tilesPushedBack: 0,
  cardsPlayed: 0,
  cardsStolen: 0,
  cardsLost: 0,
  abilitiesUsed: 0,
  turnsLost: 0,
  attacksShrugged: 0,
};

export function emptyStats(players: readonly { id: PlayerId }[]): MatchStats {
  return Object.fromEntries(players.map((player) => [player.id, EMPTY]));
}

/** Adds one command's events to the tally; a restart starts it over. */
export function tallyStats(stats: MatchStats, events: readonly GameEvent[]): MatchStats {
  let next: Record<PlayerId, PlayerStats> = { ...stats };
  const add = (id: PlayerId, patch: (current: PlayerStats) => Partial<PlayerStats>) => {
    const current = next[id] ?? EMPTY;
    next[id] = { ...current, ...patch(current) };
  };
  for (const event of events) {
    switch (event.type) {
      case "gameRestarted":
        next = Object.fromEntries(Object.keys(next).map((id) => [id, EMPTY]));
        break;
      case "diceRolled":
        add(event.playerId, (s) => ({ rolls: s.rolls + 1, biggestRoll: Math.max(s.biggestRoll, event.value) }));
        break;
      case "playerMoved":
        add(event.playerId, (s) => ({ tilesWalked: s.tilesWalked + event.path.length }));
        break;
      case "trapTriggered":
      case "hiddenTrapSprung":
        add(event.playerId, (s) => ({ trapsHit: s.trapsHit + 1 }));
        break;
      case "playerPushed":
        add(event.playerId, (s) => ({ tilesPushedBack: s.tilesPushedBack + event.path.length }));
        break;
      case "cardPlayed":
        add(event.playerId, (s) => ({ cardsPlayed: s.cardsPlayed + 1 }));
        break;
      case "cardsStolen":
        add(event.playerId, (s) => ({ cardsStolen: s.cardsStolen + event.cards.length }));
        add(event.from, (s) => ({ cardsLost: s.cardsLost + event.cards.length + event.discarded.length }));
        break;
      case "abilityUsed":
        add(event.playerId, (s) => ({ abilitiesUsed: s.abilitiesUsed + 1 }));
        break;
      case "turnSkipped":
        add(event.playerId, (s) => ({ turnsLost: s.turnsLost + 1 }));
        break;
      case "cardBlocked":
      case "abilityBlocked":
        add(event.targetId, (s) => ({ attacksShrugged: s.attacksShrugged + 1 }));
        break;
      default:
        break;
    }
  }
  return next;
}

export type AwardId =
  "unlucky" | "thief" | "punchingBag" | "cardShark" | "highRoller" | "marathon" | "wall" | "powerful";

/** A title for whoever topped one stat (ties go to the first in seat order; nobody for a zero). */
export interface Award {
  id: AwardId;
  playerId: PlayerId;
  value: number;
}

const AWARD_STATS: readonly [AwardId, keyof PlayerStats][] = [
  ["unlucky", "trapsHit"],
  ["thief", "cardsStolen"],
  ["punchingBag", "tilesPushedBack"],
  ["cardShark", "cardsPlayed"],
  ["highRoller", "biggestRoll"],
  ["marathon", "tilesWalked"],
  ["wall", "attacksShrugged"],
  ["powerful", "abilitiesUsed"],
];

export function awardsOf(stats: MatchStats): Award[] {
  const players = Object.entries(stats);
  return AWARD_STATS.flatMap(([id, key]) => {
    const [best] = players.reduce<[PlayerId | null, number]>(
      ([leader, top], [playerId, entry]) => (entry[key] > top ? [playerId, entry[key]] : [leader, top]),
      [null, 0],
    );
    return best === null ? [] : [{ id, playerId: best, value: stats[best]?.[key] ?? 0 }];
  });
}
