import { generateBoard } from "./boardGenerator";
import { TRACK_LENGTH, trackEffects } from "./realms";
import type { Board, Player, PlayerId, RealmTrack, Tile, TileEffect, TileId, TrapZone } from "./types";

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

/** The tile on the main path standing for `id`: itself, or the portal of the track it's on. */
export function mainTileOf(board: Board, id: TileId): TileId {
  return getTile(board, id).track?.portal ?? id;
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
 * path or the same realm track, see sameSpace) and not under Spectral Armour.
 */
export function opponentsInReach(board: Board, players: readonly Player[], playerId: PlayerId): Player[] {
  const here = players.find((player) => player.id === playerId)?.position;
  if (here === undefined) return [];
  return players.filter(
    (player) => player.id !== playerId && player.spectralArmour === 0 && sameSpace(board, player.position, here),
  );
}

export function trackOf(board: Board, id: TileId): RealmTrack | null {
  const placement = getTile(board, id).track;
  return placement ? (board.tracks.find((track) => track.portal === placement.portal) ?? null) : null;
}
