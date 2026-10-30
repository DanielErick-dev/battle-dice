import { chargeAbility, FLAME_TURNS, isAbilityReady, VOID_CAPACITY, VOID_DOUBLE_ENERGY } from "./abilities";
import { getTile, linkRift } from "./board";
import { frozenTiles } from "./fairy";
import { GameRuleError } from "./commands";
import { playerIn, pushPath, updatePlayer, type Draft } from "./draft";
import type { GameEvent } from "./events";
import { HIDDEN_TRAP_PUSH } from "./hiddenTraps";
import type {
  Board,
  GameState,
  Player,
  PlayerId,
  Threat,
  Tile,
  TileEffect,
  TileId,
  VoidHarm,
  VoidItem,
  VoidSpell,
} from "./types";

/** Ready, with room left in the Void. */
export function canSwallow(player: Player): boolean {
  return player.ability === "theVoid" && isAbilityReady(player) && player.voidHold.length < VOID_CAPACITY;
}

export function offerSwallow(draft: Draft, playerId: PlayerId, tile: TileId, threat: Threat): void {
  draft.pendingWard = { tile, threat };
  draft.events.push({ type: "wardOffered", playerId, tile, threat });
}

/** The harm on `tile` goes into the Void and the tile is left harmless for good. */
export function swallow(draft: Draft, playerId: PlayerId, tile: TileId, threat: Threat): void {
  const item = harmItem(draft, tile, threat);
  const hidden = threat === "hiddenTrap";
  if (hidden) draft.hiddenTraps = draft.hiddenTraps.filter((trap) => trap !== tile);
  if (!draft.destroyedTraps.includes(tile)) draft.destroyedTraps = [...draft.destroyedTraps, tile];
  draft.pinnedTraps = draft.pinnedTraps.filter((pinned) => pinned !== tile);
  updatePlayer(draft, playerId, (player) => ({
    abilityCharge: 0,
    voidIdle: 0,
    voidHold: [...player.voidHold, item],
  }));
  draft.events.push(
    { type: "abilityUsed", playerId, ability: "theVoid" },
    { type: "voidSwallowed", playerId, tile, item, hidden },
  );
}

function harmItem(draft: Draft, tile: TileId, threat: Threat): VoidItem {
  const { board } = draft.state;
  const { effect } = getTile(board, tile);
  if (threat === "hiddenTrap") return { kind: "trap", back: HIDDEN_TRAP_PUSH };
  if (threat === "skipTurn") return { kind: "skipTurn" };
  if (effect.kind === "curse") return { kind: "curse", curse: effect.curse };
  if (effect.kind !== "trap") throw new Error(`No harm to swallow on tile ${tile}`);
  const back = stepsBack(board, tile, effect.to);
  return effect.curse ? { kind: "trap", back, curse: effect.curse } : { kind: "trap", back };
}

/** Along the way back (rifts included), or the plain difference when `to` isn't behind. */
function stepsBack(board: Board, from: TileId, to: TileId): number {
  let tile: TileId | null = from;
  for (let steps = 0; tile !== null && steps <= board.tiles.length; steps++) {
    if (tile === to) return Math.max(1, steps);
    tile = getTile(board, tile).previous;
  }
  return Math.max(1, Math.abs(from - to));
}

export function isHarm(item: VoidItem): item is VoidHarm {
  return item.kind === "trap" || item.kind === "curse" || item.kind === "skipTurn";
}

/** Main-path tiles (and rifts) a rift may open right after: anywhere short of the finish. */
export function riftAnchors(board: Board): TileId[] {
  return board.tiles
    .filter(({ role, track, next }) => !track && next !== null && role !== "finish")
    .map(({ id }) => id);
}

/** The board and the spells on it, as the state or the screen holds them. */
type SpellBoard = Pick<GameState, "board" | "blackFlames" | "enchantedTiles" | "winter"> & {
  seals: readonly { tile: TileId }[];
  specters: readonly { tile: TileId }[];
};

/** Regular main-path tiles free of every spell, where a spell taken by the Void may land. */
export function spellGround(state: SpellBoard): TileId[] {
  const taken = new Set([...spellTiles(state), ...frozenTiles(state.winter, state.board.startTile)]);
  return state.board.tiles
    .filter(({ id, role, track }) => role === "regular" && !track && !taken.has(id))
    .map(({ id }) => id);
}

/** Tiles holding a spell the idle Void may take over: fire, snow, the fairy's picked ice, seals, apparitions. */
export function spellTiles(state: Omit<SpellBoard, "board">) {
  return [
    ...state.blackFlames.map(({ tile }) => tile),
    ...state.enchantedTiles.map(({ tile }) => tile),
    ...(state.winter?.iced ?? []),
    ...state.seals.map(({ tile }) => tile),
    ...state.specters.map(({ tile }) => tile),
  ];
}

/** A harm opens a new tile into the path; a spell is set on a free tile, now Zarek's own. */
export function placeVoid(
  draft: Draft,
  playerId: PlayerId,
  { index, tile, doubled = false }: { index: number; tile: TileId; doubled?: boolean },
): Board {
  const player = playerIn(draft, playerId);
  const item = player.voidHold[index];
  if (player.ability !== "theVoid" || !item) throw new GameRuleError("INVALID_VOID");
  const { board } = draft.state;

  if (!isHarm(item)) {
    if (doubled || !spellGround(draftView(draft)).includes(tile)) throw new GameRuleError("INVALID_VOID");
    release(draft, playerId, index);
    castSpell(draft, playerId, item, tile);
    draft.events.push({ type: "voidCast", playerId, tile, item });
    return board;
  }

  if (!riftAnchors(board).includes(tile)) throw new GameRuleError("INVALID_VOID");
  if (doubled && player.energy < VOID_DOUBLE_ENERGY) throw new GameRuleError("NOT_ENOUGH_ENERGY");
  release(draft, playerId, index);
  if (doubled) updatePlayer(draft, playerId, (current) => ({ energy: current.energy - VOID_DOUBLE_ENERGY }));
  const rift = openRift(board, tile, playerId, item, doubled);
  const linked = linkRift(board, rift);
  draft.events.push({ type: "riftOpened", playerId, rift: getTile(linked, rift.id) });
  return linked;
}

function release(draft: Draft, playerId: PlayerId, index: number): void {
  updatePlayer(draft, playerId, (player) => ({ voidHold: player.voidHold.filter((_, held) => held !== index) }));
}

function draftView(draft: Draft) {
  return {
    board: draft.state.board,
    blackFlames: draft.blackFlames,
    enchantedTiles: draft.enchantedTiles,
    winter: draft.winter,
    seals: draft.seals,
    specters: draft.specters,
  };
}

function castSpell(draft: Draft, owner: PlayerId, item: VoidSpell, tile: TileId): void {
  switch (item.kind) {
    case "flame":
      draft.blackFlames = [...draft.blackFlames, { tile, owner, turnsLeft: FLAME_TURNS, hits: 0 }];
      return;
    case "snow":
      draft.enchantedTiles = [...draft.enchantedTiles, { tile, owner }];
      return;
    case "seal":
      draft.seals = [...draft.seals, { tile, kind: item.seal, owner }];
      return;
    case "specter":
      draft.specters = [...draft.specters, { tile, kind: item.specter, owner }];
      return;
  }
}

/** A new tile appended to the board (every id keeps its place) and linked in right after `after`. */
export function openRift(board: Board, after: TileId, owner: PlayerId, item: VoidHarm, doubled: boolean): Tile {
  const id = board.tiles.length + 1;
  const back = item.kind === "trap" ? item.back * (doubled ? 2 : 1) : undefined;
  const rift: Tile = {
    id,
    role: "rift",
    effect: { kind: "none" },
    next: null,
    previous: null,
    rift: { owner, doubled, after, ...(back !== undefined && { back }) },
  };
  return { ...rift, effect: riftEffect(linkRift(board, rift), id, item, back) };
}

function riftEffect(board: Board, id: TileId, item: VoidHarm, back: number | undefined): TileEffect {
  if (item.kind === "skipTurn") return { kind: "skipTurn" };
  if (item.kind === "curse") return { kind: "curse", curse: item.curse };
  const to = pushPath(board, id, back ?? item.back).at(-1) ?? board.startTile;
  return item.curse ? { kind: "trap", to, curse: item.curse } : { kind: "trap", to };
}

/** The rift tiles in the order they opened, each to be linked in again on the plain board (see linkRift). */
export function riftsOf(board: Board): Tile[] {
  return board.tiles.filter((tile) => tile.role === "rift");
}

/** The plain board with `rifts` linked in, as the screen rebuilds it. */
export function withRifts(board: Board, rifts: readonly Tile[]): Board {
  return rifts.reduce(linkRift, board);
}

/** Rifts close for a new match: each tile links back to its neighbours of the original path. */
export function closeRifts(board: Board): Board {
  const isRift = (id: TileId | null) => id !== null && getTile(board, id).role === "rift";
  const skip = (id: TileId | null, step: (tile: Tile) => TileId | null) => {
    let tile = id;
    while (tile !== null && isRift(tile)) tile = step(getTile(board, tile));
    return tile;
  };
  return {
    ...board,
    tiles: board.tiles
      .filter((tile) => tile.role !== "rift")
      .map((tile) => ({
        ...tile,
        next: skip(tile.next, ({ next }) => next),
        previous: skip(tile.previous, ({ previous }) => previous),
      })),
  };
}

/** Idle long enough, the Void takes over the spell on `tile`, whoever cast it. */
export function seize(draft: Draft, playerId: PlayerId, tile: TileId | undefined): void {
  const item = tile === undefined ? null : takeSpell(draft, tile);
  if (tile === undefined || !item) throw new GameRuleError("INVALID_VOID");
  updatePlayer(draft, playerId, (player) => ({ voidIdle: 0, voidHold: [...player.voidHold, item] }));
  draft.events.push({ type: "voidSeized", playerId, tile, item });
}

function takeSpell(draft: Draft, tile: TileId): VoidItem | null {
  const at = <T extends { tile: TileId }>(list: readonly T[]) => list.find((entry) => entry.tile === tile);
  const flame = at(draft.blackFlames);
  if (flame) {
    draft.blackFlames = draft.blackFlames.filter((entry) => entry !== flame);
    return { kind: "flame" };
  }
  const snow = at(draft.enchantedTiles);
  if (snow) {
    draft.enchantedTiles = draft.enchantedTiles.filter((entry) => entry !== snow);
    return { kind: "snow" };
  }
  if (draft.winter?.iced.includes(tile)) {
    draft.winter = { ...draft.winter, iced: draft.winter.iced.filter((iced) => iced !== tile) };
    return { kind: "snow" };
  }
  const seal = at(draft.seals);
  if (seal) {
    draft.seals = draft.seals.filter((entry) => entry !== seal);
    return { kind: "seal", seal: seal.kind };
  }
  const specter = at(draft.specters);
  if (specter) {
    draft.specters = draft.specters.filter((entry) => entry !== specter);
    return { kind: "specter", specter: specter.kind };
  }
  return null;
}

/** Ending his turn, the Void has been idle a turn longer. */
export function restlessVoid(player: Player): Player {
  return player.ability === "theVoid" ? { ...player, voidIdle: player.voidIdle + 1 } : player;
}

/** Every trap fallen into, smashed or pinned this command feeds each Void a charge; its own swallowing doesn't. */
export function feedTheVoid(draft: Draft): void {
  const fed = draft.events.reduce((count, event) => count + trapsIn(event), 0);
  if (fed === 0) return;
  for (const { id, ability } of draft.players) {
    if (ability !== "theVoid") continue;
    let player = playerIn(draft, id);
    let becameReady = false;
    for (let meal = 0; meal < fed; meal++) {
      const charged = chargeAbility(player, { fromBoard: true });
      player = charged.player;
      becameReady ||= charged.becameReady;
    }
    const gained = player.abilityCharge - playerIn(draft, id).abilityCharge;
    if (gained === 0) continue;
    updatePlayer(draft, id, () => ({ abilityCharge: player.abilityCharge }));
    draft.events.push({ type: "voidFed", playerId: id, charge: gained });
    if (becameReady) draft.events.push({ type: "abilityReady", playerId: id, ability: "theVoid" });
  }
}

function trapsIn(event: GameEvent): number {
  switch (event.type) {
    case "trapTriggered":
    case "hiddenTrapSprung":
    case "hiddenTrapDisarmed":
    case "trapDestroyed":
      return 1;
    case "arrowsLoosed":
      return event.pinned.length;
    default:
      return 0;
  }
}
