import { chargeAbility, isAbilityReady } from "../../abilities/charge";
import { FLAME_TURNS } from "../kage/flames";
import { getTile, linkRift } from "../../board/board";
import { frozenTiles } from "../fairy/winter";
import { GameRuleError } from "../../core/errors";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { pushPath } from "../../board/paths";
import type { GameEvent } from "../../core/events";
import { HIDDEN_TRAP_PUSH } from "../../board/hiddenTraps";
import type { VoidHarm, VoidItem, VoidScar, VoidSpell } from "./types";
import type { Board, Threat, Tile, TileEffect, TileId } from "../../board/types";
import type { GameState, Player, PlayerId } from "../../core/state";

/** Things Zarek's Void holds at once. */
export const VOID_CAPACITY = 4;
/** Paid to set a harm down with its penalty doubled. */
export const VOID_DOUBLE_ENERGY = 2;
/** The setback of the purple trap left where the Void took a spell. */
export const VOID_SCAR_BACK = 4;

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
  updatePlayer(draft, playerId, () => ({ abilityCharge: 0 }));
  draft.events.push({ type: "abilityUsed", playerId, ability: "theVoid" });
  devour(draft, playerId, tile, threat);
}

/** Swallowing without the ability (Hungry Rift): the harm goes in, the charge stays. */
export function devour(draft: Draft, playerId: PlayerId, tile: TileId, threat: Threat): void {
  const item = harmItem(draft, tile, threat);
  const hidden = threat === "hiddenTrap";
  if (hidden) draft.hiddenTraps = draft.hiddenTraps.filter((trap) => trap !== tile);
  if (!draft.destroyedTraps.includes(tile)) draft.destroyedTraps = [...draft.destroyedTraps, tile];
  draft.pinnedTraps = draft.pinnedTraps.filter((pinned) => pinned !== tile);
  updatePlayer(draft, playerId, (player) => ({ voidIdle: 0, voidHold: [...player.voidHold, item] }));
  draft.events.push({ type: "voidSwallowed", playerId, tile, item, hidden });
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
type SpellBoard = Pick<GameState, "board" | "blackFlames" | "enchantedTiles" | "winter" | "voidScars"> & {
  seals: readonly { tile: TileId; owner: PlayerId }[];
  specters: readonly { tile: TileId; owner: PlayerId }[];
};

/** Hell takes the Void's impurity, heaven never does; a track has no room for a new tile, so harms mark one there. */
function inHellTrack(board: Board, tile: TileId): boolean {
  return getTile(board, tile).track?.realm === "infernal";
}

function occupied(state: SpellBoard): Set<TileId> {
  return new Set([
    ...spellTiles(state),
    ...frozenTiles(state.winter, state.board.startTile),
    ...state.voidScars.map(({ tile }) => tile),
  ]);
}

/** Regular main-path and hell tiles free of every spell and mark, where a spell taken by the Void may land. */
export function spellGround(state: SpellBoard): TileId[] {
  const taken = occupied(state);
  return state.board.tiles
    .filter(({ id, role, track }) => (role === "regular" && !track) || inHellTrack(state.board, id))
    .filter(({ id }) => !taken.has(id))
    .map(({ id }) => id);
}

/** Another's spell, on the main path or in hell, that the ready Void may absorb (heaven keeps none). */
export function seizableTiles(state: SpellBoard, owner: PlayerId): TileId[] {
  const others = <T extends { tile: TileId; owner: PlayerId }>(list: readonly T[]) =>
    list.filter((entry) => entry.owner !== owner).map(({ tile }) => tile);
  const iced = state.winter && state.winter.owner !== owner ? state.winter.iced : [];
  const spells = [
    ...others(state.blackFlames),
    ...others(state.enchantedTiles),
    ...iced,
    ...others(state.seals),
    ...others(state.specters),
  ];
  return [...new Set(spells)].filter((tile) => {
    const { role, track } = getTile(state.board, tile);
    return (role === "regular" && !track) || inHellTrack(state.board, tile);
  });
}

/** Where a held harm may go: a rift after a main-path tile, or a mark on a free hell tile. */
export function harmGround(state: SpellBoard): TileId[] {
  const taken = occupied(state);
  const hell = state.board.tiles.filter(({ id }) => inHellTrack(state.board, id) && !taken.has(id));
  return [...riftAnchors(state.board), ...hell.map(({ id }) => id)];
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

  if (!harmGround(draftView(draft)).includes(tile)) throw new GameRuleError("INVALID_VOID");
  if (doubled && player.energy < VOID_DOUBLE_ENERGY) throw new GameRuleError("NOT_ENOUGH_ENERGY");
  release(draft, playerId, index);
  if (doubled) updatePlayer(draft, playerId, (current) => ({ energy: current.energy - VOID_DOUBLE_ENERGY }));
  if (inHellTrack(board, tile)) {
    draft.voidScars = [...draft.voidScars, { tile, owner: playerId, harm: item, doubled }];
    draft.events.push({ type: "voidCast", playerId, tile, item });
    return board;
  }
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
    voidScars: draft.voidScars,
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

/** The Void absorbs another's spell on `tile` to set down anywhere later; a purple trap of Zarek's is left behind. */
export function seize(draft: Draft, playerId: PlayerId, tile: TileId | undefined): void {
  if (playerIn(draft, playerId).voidHold.length >= VOID_CAPACITY) throw new GameRuleError("VOID_FULL");
  const valid = tile !== undefined && seizableTiles(draftView(draft), playerId).includes(tile);
  const item = valid ? absorbSpell(draft, playerId, tile) : null;
  if (tile === undefined || !item) throw new GameRuleError("INVALID_VOID");
  const scar: VoidScar = { tile, owner: playerId, harm: { kind: "trap", back: VOID_SCAR_BACK }, doubled: false };
  draft.voidScars = [...draft.voidScars, scar];
  updatePlayer(draft, playerId, (player) => ({ voidIdle: 0, voidHold: [...player.voidHold, item] }));
  draft.events.push({ type: "voidSeized", playerId, tile, item });
}

function absorbSpell(draft: Draft, owner: PlayerId, tile: TileId): VoidItem | null {
  const take = <T extends { tile: TileId; owner: PlayerId }>(list: readonly T[]) => {
    const found = list.find((entry) => entry.tile === tile && entry.owner !== owner);
    return { found, list: list.filter((entry) => entry !== found) };
  };
  const flame = take(draft.blackFlames);
  if (flame.found) {
    draft.blackFlames = flame.list;
    return { kind: "flame" };
  }
  const snow = take(draft.enchantedTiles);
  if (snow.found) {
    draft.enchantedTiles = snow.list;
    return { kind: "snow" };
  }
  // The fairy's ice leaves her winter and goes into the Void as snow.
  if (draft.winter && draft.winter.owner !== owner && draft.winter.iced.includes(tile)) {
    draft.winter = { ...draft.winter, iced: draft.winter.iced.filter((iced) => iced !== tile) };
    return { kind: "snow" };
  }
  const seal = take(draft.seals);
  if (seal.found) {
    draft.seals = seal.list;
    return { kind: "seal", seal: seal.found.kind };
  }
  const specter = take(draft.specters);
  if (specter.found) {
    draft.specters = specter.list;
    return { kind: "specter", specter: specter.found.kind };
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
    case "trapDestroyed":
      return 1;
    case "arrowsLoosed":
      return event.pinned.length;
    default:
      return 0;
  }
}
