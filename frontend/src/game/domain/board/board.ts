import { TRACK_LENGTH, trackEffects } from "./realms";
import type { Board, RealmEntry, RealmTrack, Tile, TileEffect, TileId, TrapZone } from "@/game/domain/types";

export interface BoardDefinition {
  size: number;
  effects: Readonly<Record<TileId, TileEffect>>;
  /** `from`–`to` inclusive. */
  trapZones?: readonly TrapZoneDefinition[];
}

export interface TrapZoneDefinition {
  from: TileId;
  to: TileId;
  traps: number;
}

/** Realm track tiles are numbered after the main path; a track's last tile leads to its portal's destination. */
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
    const realmKind = effect.realm;

    // Each realm is one: every further portal into it opens onto the track already laid out.
    const realm = tracks.find((track) => track.realm === realmKind);
    if (realm) {
      tracks[tracks.indexOf(realm)] = {
        ...realm,
        entries: [...realm.entries, { portal: portal.id, exit: effect.to }],
      };
      continue;
    }

    const first = tiles.length + 1;
    const ids = Array.from({ length: TRACK_LENGTH }, (_, index) => first + index);
    trackEffects(realmKind, portal.id, ids).forEach((trackEffect, index) => {
      const id = ids[index];
      tiles.push({
        id,
        role: "track",
        effect: trackEffect,
        next: index === TRACK_LENGTH - 1 ? effect.to : id + 1,
        previous: index === 0 ? portal.id : id - 1,
        track: { realm: realmKind, portal: portal.id, index },
      });
    });
    tracks.push({
      realm: realmKind,
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

/** Needs more plain tiles than traps, so a sprung trap has somewhere to go. */
function createTrapZone(tiles: readonly Tile[], { from, to, traps }: TrapZoneDefinition): TrapZone {
  const plain = tiles
    .filter((tile) => tile.id >= from && tile.id <= to && tile.role === "regular" && tile.effect.kind === "none")
    .map((tile) => tile.id);
  if (plain.length <= traps) throw new RangeError(`Trap zone ${from}–${to} needs more than ${traps} plain tiles`);
  return { tiles: plain, traps };
}

/** Appends a rift tile (see characters/zarek/rifts.ts) and links it in right after the tile it opened after. */
export function linkRift(board: Board, rift: Tile): Board {
  if (!rift.rift) throw new Error(`Tile ${rift.id} is no rift`);
  const { after } = rift.rift;
  const onward = getTile(board, after).next;
  const tiles = board.tiles.map((tile) => {
    if (tile.id === after) return { ...tile, next: rift.id };
    if (tile.id === onward) return { ...tile, previous: rift.id };
    return tile;
  });
  return { ...board, tiles: [...tiles, { ...rift, next: onward, previous: after }] };
}

export function getTile(board: Board, id: TileId): Tile {
  const tile = board.tiles[id - 1];
  if (!tile) throw new RangeError(`Tile ${id} is outside the board`);
  return tile;
}

/** `id` itself, or the portal of its track (the one of `entry`, when given). */
export function mainTileOf(board: Board, id: TileId, entry?: RealmEntry | null): TileId {
  const placement = getTile(board, id).track;
  return placement ? (entry?.portal ?? placement.portal) : id;
}

/** Off a track's last tile, the exit of the portal the player came by. */
export function nextTile(board: Board, id: TileId, entry?: RealmEntry | null): TileId | null {
  const tile = getTile(board, id);
  if (entry && tile.track && tile.next !== null && !getTile(board, tile.next).track) return entry.exit;
  return tile.next;
}

/** Back past a track's first tile, the portal the player came by. */
export function previousTile(board: Board, id: TileId, entry?: RealmEntry | null): TileId | null {
  const tile = getTile(board, id);
  if (entry && tile.track?.index === 0) return entry.portal;
  return tile.previous;
}

export function trackOf(board: Board, id: TileId): RealmTrack | null {
  const placement = getTile(board, id).track;
  return placement ? (board.tracks.find((track) => track.portal === placement.portal) ?? null) : null;
}
