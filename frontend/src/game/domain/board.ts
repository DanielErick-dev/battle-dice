import { generateBoard } from "./boardGenerator";
import { TRACK_LENGTH, trackEffects } from "./realms";
import { isUntouchable } from "./players";
import type { Board, Player, PlayerId, RealmEntry, RealmTrack, Tile, TileEffect, TileId, TrapZone } from "./types";

export interface BoardDefinition {
  size: number;
  effects: Readonly<Record<TileId, TileEffect>>;
  /** Stretches of the main path (`from`–`to`, inclusive) hiding `traps` traps among their plain tiles. */
  trapZones?: readonly TrapZoneDefinition[];
}

export interface TrapZoneDefinition {
  from: TileId;
  to: TileId;
  traps: number;
}

export const CLASSIC_BOARD: BoardDefinition = {
  size: 20,
  effects: {
    5: { kind: "portal", to: 10 },
    8: { kind: "trap", to: 6 },
    15: { kind: "portal", to: 19 },
    18: { kind: "trap", to: 17 },
  },
};

/** The classic board plus card tiles, cursed traps and realm portals: what the "Treino" preset plays on. */
export const TRAINING_BOARD: BoardDefinition = {
  ...CLASSIC_BOARD,
  effects: {
    ...CLASSIC_BOARD.effects,
    ...cards([3, 12]),
    5: { kind: "portal", to: 10, realm: "infernal" },
    8: { kind: "trap", to: 6, curse: "drain" },
    15: { kind: "portal", to: 19, realm: "celestial" },
    18: { kind: "trap", to: 17, curse: "discard" },
    // Blessings of energy, so cards can be played more often.
    4: { kind: "blessing", blessing: "energy" },
    16: { kind: "blessing", blessing: "energy" },
  },
  trapZones: [{ from: 9, to: 14, traps: 1 }],
};

/** 200 tiles laid out by the generator; the fixed seed keeps it identical for everyone. */
export const POWER_TOURNAMENT_BOARD: BoardDefinition = generateBoard({
  size: 200,
  seed: 2026,
  density: {
    portal: 6,
    trap: 9,
    advance: 8,
    extraTurn: 4,
    skipTurn: 4,
    card: 12,
    energy: 10,
    charge: 5,
  },
  trapZones: { count: 3, length: 10, traps: 2 },
  // The opening has no portal: everyone plays through it, and the Mystic Gate can't skip it.
  portalsFrom: 25,
});

function cards(tiles: readonly TileId[]): Record<TileId, TileEffect> {
  return Object.fromEntries(tiles.map((id) => [id, { kind: "card" } as const]));
}

/**
 * Builds the main path (tiles 1 to `size`, each leading to the next) and, for every realm
 * portal, a track of TRACK_LENGTH tiles numbered after the main path: the portal carries the
 * player onto its first tile, and its last tile leads on to the portal's destination.
 */
export function createBoard({ size, effects, trapZones = [] }: BoardDefinition): Board {
  const startTile = 1;
  const finishTile = size;

  const tiles: Tile[] = Array.from({ length: size }, (_, index) => {
    const id = index + 1;
    return {
      id,
      role: id === startTile ? "start" : id === finishTile ? "finish" : "regular",
      effect: effects[id] ?? { kind: "none" },
      next: id === finishTile ? null : id + 1,
      previous: id === startTile ? null : id - 1,
    };
  });

  const tracks: RealmTrack[] = [];
  for (const portal of [...tiles]) {
    const { effect } = portal;
    if (effect.kind !== "portal" || !effect.realm) continue;

    // Each realm is one: every further portal into it opens onto the track already laid out.
    const realm = tracks.find((track) => track.realm === effect.realm);
    if (realm) {
      tracks[tracks.indexOf(realm)] = {
        ...realm,
        entries: [...realm.entries, { portal: portal.id, exit: effect.to }],
      };
      continue;
    }

    const first = tiles.length + 1;
    const ids = Array.from({ length: TRACK_LENGTH }, (_, index) => first + index);
    trackEffects(effect.realm, portal.id, ids).forEach((trackEffect, index) => {
      const id = ids[index];
      tiles.push({
        id,
        role: "track",
        effect: trackEffect,
        next: index === TRACK_LENGTH - 1 ? effect.to : id + 1,
        previous: index === 0 ? portal.id : id - 1,
        track: { realm: effect.realm!, portal: portal.id, index },
      });
    });
    tracks.push({
      realm: effect.realm,
      portal: portal.id,
      exit: effect.to,
      tiles: ids,
      entries: [{ portal: portal.id, exit: effect.to }],
    });
  }

  return {
    tiles,
    startTile,
    finishTile,
    tracks,
    trapZones: trapZones.map((zone) => createTrapZone(tiles, zone)),
  };
}

/** A zone's plain tiles; it needs more of them than traps, so a sprung trap has somewhere to go. */
function createTrapZone(tiles: readonly Tile[], { from, to, traps }: TrapZoneDefinition): TrapZone {
  const plain = tiles
    .filter((tile) => tile.id >= from && tile.id <= to && tile.role === "regular" && tile.effect.kind === "none")
    .map((tile) => tile.id);
  if (plain.length <= traps) throw new RangeError(`Trap zone ${from}–${to} needs more than ${traps} plain tiles`);
  return { tiles: plain, traps };
}

export function getTile(board: Board, id: TileId): Tile {
  const tile = board.tiles[id - 1];
  if (!tile) throw new RangeError(`Tile ${id} is outside the board`);
  return tile;
}

/**
 * The tile on the main path standing for `id`: itself, or the portal of the track it's on (the one
 * the player came in by, `entry`, when given).
 */
export function mainTileOf(board: Board, id: TileId, entry?: RealmEntry | null): TileId {
  const placement = getTile(board, id).track;
  return placement ? (entry?.portal ?? placement.portal) : id;
}

/**
 * The tile after `id` for a player who came into its realm by `entry`: off a track's last tile,
 * the exit of the portal they came by; anywhere else, the tile's own `next`.
 */
export function nextTile(board: Board, id: TileId, entry?: RealmEntry | null): TileId | null {
  const tile = getTile(board, id);
  if (entry && tile.track && tile.next !== null && !getTile(board, tile.next).track) return entry.exit;
  return tile.next;
}

/** The tile before `id` for that player: back past a track's first tile, the portal they came by. */
export function previousTile(board: Board, id: TileId, entry?: RealmEntry | null): TileId | null {
  const tile = getTile(board, id);
  if (entry && tile.track?.index === 0) return entry.portal;
  return tile.previous;
}

/**
 * Whether two tiles are in the same place: both on the main path, or both inside the same realm
 * track. A realm is cut off from the board: what happens in one can't reach players in the other.
 */
export function sameSpace(board: Board, a: TileId, b: TileId): boolean {
  return (getTile(board, a).track?.portal ?? null) === (getTile(board, b).track?.portal ?? null);
}

/**
 * The opponents `playerId` can aim a card or an ability at: those in the same place (the main
 * path or the same realm track, see sameSpace) and not untouchable (see isUntouchable).
 */
export function opponentsInReach(board: Board, players: readonly Player[], playerId: PlayerId): Player[] {
  return opponentsInSpace(board, players, playerId).filter((player) => !isUntouchable(player));
}

/**
 * The opponents in the same place as `playerId` (see sameSpace), untouchable or not: an ability
 * aimed at one of these can be thrown, and an armoured one turns it away (see aimWard).
 */
export function opponentsInSpace(board: Board, players: readonly Player[], playerId: PlayerId): Player[] {
  const here = players.find((player) => player.id === playerId)?.position;
  if (here === undefined) return [];
  return players.filter((player) => player.id !== playerId && sameSpace(board, player.position, here));
}

export function trackOf(board: Board, id: TileId): RealmTrack | null {
  const placement = getTile(board, id).track;
  return placement ? (board.tracks.find((track) => track.portal === placement.portal) ?? null) : null;
}
