import { abilityCycle } from "../../abilities/charge";
import { aimAbility } from "../../abilities/aim";
import { getTile } from "../../board/board";
import { pushPath, walkPath } from "../../board/paths";
import { opponentsInSpace, sameSpace } from "../../board/reach";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { GameRuleError } from "../../core/errors";
import { isUntouchable } from "../../core/playerStatus";
import type { Board, TileId } from "../../board/types";
import type { Player, PlayerId } from "../../core/state";
import { ELEMENTS, type Element, type Elementals, type StoneWall } from "./types";

/** Tectonic Wall: its hp, how many of his can stand at once, and how far ahead of anyone it may rise. */
export const WALL_HP = 8;
export const MAX_WALLS = 2;
export const WALL_REACH = 6;
/** Current Bond: own turns it lasts and the share of the target's walk that pulls him along. */
export const TETHER_TURNS = 3;
export const TETHER_SHARE = 0.5;
/** Combustion Die: a face this high explodes, multiplying the roll and throwing back everyone this close. */
export const COMBUSTION_FACE = 5;
export const COMBUSTION_MULTIPLIER = 2;
export const COMBUSTION_PUSH = 6;
export const COMBUSTION_RADIUS = 3;
/** Breeze Heist: an opponent roll this high (bonuses included) is stolen. */
export const BREEZE_THRESHOLD = 6;
/** Convergence: own turns untouchable (the current one included) and the bonus on this turn's roll. */
export const CONVERGENCE_TURNS = 2;
export const CONVERGENCE_BONUS = 3;

/** The four elements are Tenzai's; the ability id outlived his old name. */
export function isTenzai(player: Player): boolean {
  return player.ability === "fourElements";
}

/** What the ability is used with: the element, plus the wall's tile or the bond's target. */
export interface ElementChoice {
  element?: Element;
  wallTile?: TileId;
  targetId?: PlayerId;
}

/** Free plain tiles up to WALL_REACH ahead of anyone on the main path: no portal, player or wall on them. */
export function wallableTiles(board: Board, players: readonly Player[], elementals: Elementals): TileId[] {
  const taken = new Set([...players.map((player) => player.position), ...elementals.walls.map((wall) => wall.tile)]);
  const tiles = new Set<TileId>();
  for (const player of players) {
    if (getTile(board, player.position).track) continue;
    for (const tile of walkPath(board, player.position, WALL_REACH)) {
      const { role, effect } = getTile(board, tile);
      if (role === "regular" && effect.kind !== "portal" && !taken.has(tile)) tiles.add(tile);
    }
  }
  return [...tiles].sort((a, b) => a - b);
}

/** The first wallable tile ahead of `target`, where his cards raise a wall on their own. */
export function wallTileAhead(draft: Draft, target: Player): TileId | null {
  const free = new Set(wallableTiles(draft.state.board, draft.players, draft.elementals));
  return (
    walkPath(draft.state.board, target.position, WALL_REACH, target.realmEntry).find((tile) => free.has(tile)) ?? null
  );
}

/** Opponents a bond can reach: the same place, protected ones included (they turn it away). */
export function tetherTargets(board: Board, players: readonly Player[], playerId: PlayerId): Player[] {
  return opponentsInSpace(board, players, playerId);
}

/** Cuts a forward walk short of the first wall that isn't `walkerId`'s own. */
export function clipAtWalls(
  draft: Draft,
  walkerId: PlayerId,
  path: readonly TileId[],
): { path: TileId[]; wall: StoneWall | null } {
  const index = path.findIndex((tile) =>
    draft.elementals.walls.some((wall) => wall.tile === tile && wall.owner !== walkerId),
  );
  if (index === -1) return { path: [...path], wall: null };
  const wall = draft.elementals.walls.find((candidate) => candidate.tile === path[index]) ?? null;
  return { path: path.slice(0, index), wall };
}

/** A roll ran into `wall`: it takes the roll's value off its hp and crumbles at zero. */
export function hitWall(draft: Draft, playerId: PlayerId, wall: StoneWall, damage: number): void {
  const hp = Math.max(0, wall.hp - damage);
  draft.events.push({ type: "wallHit", playerId, tile: wall.tile, damage, hp });
  if (hp === 0) {
    crumble(draft, wall);
    return;
  }
  setWalls(draft, (walls) =>
    walls.map((candidate) => (candidate.tile === wall.tile ? { ...candidate, hp } : candidate)),
  );
}

function crumble(draft: Draft, wall: StoneWall): void {
  setWalls(draft, (walls) => walls.filter((candidate) => candidate.tile !== wall.tile));
  draft.events.push({ type: "wallCrumbled", owner: wall.owner, tile: wall.tile });
}

function setWalls(draft: Draft, change: (walls: readonly StoneWall[]) => readonly StoneWall[]): void {
  draft.elementals = { ...draft.elementals, walls: change(draft.elementals.walls) };
}

/** A new wall on `tile` (it must be wallable); past MAX_WALLS his oldest one crumbles. */
export function raiseWall(draft: Draft, owner: PlayerId, tile: TileId | undefined, hp: number): void {
  const allowed = wallableTiles(draft.state.board, draft.players, draft.elementals);
  if (tile === undefined || !allowed.includes(tile)) throw new GameRuleError("INVALID_WALL");
  const own = draft.elementals.walls.filter((wall) => wall.owner === owner);
  const oldest = own[0];
  if (own.length >= MAX_WALLS && oldest) crumble(draft, oldest);
  setWalls(draft, (walls) => [...walls, { tile, owner, hp, maxHp: hp }]);
  draft.events.push({ type: "wallRaised", playerId: owner, tile, hp });
}

/** Binds `target` to `owner` for `turns` of the owner's turns (a bond of his already there snaps). */
export function bindTether(draft: Draft, owner: PlayerId, target: PlayerId, turns: number, share = TETHER_SHARE): void {
  snapTether(draft, owner);
  // The turn it's bound on ends at once and counts down one: `turns` whole rounds still follow.
  const tether = { owner, target, turnsLeft: turns + 1, share };
  draft.elementals = { ...draft.elementals, tethers: [...draft.elementals.tethers, tether] };
  draft.events.push({ type: "tetherBound", playerId: owner, targetId: target, turns });
}

export function snapTether(draft: Draft, owner: PlayerId): void {
  const tether = draft.elementals.tethers.find((candidate) => candidate.owner === owner);
  if (!tether) return;
  draft.elementals = {
    ...draft.elementals,
    tethers: draft.elementals.tethers.filter((candidate) => candidate !== tether),
  };
  draft.events.push({ type: "tetherSnapped", playerId: owner, targetId: tether.target });
}

/** `targetId` walked `steps` forward: whoever bound them is pulled their share (walls still stop him). */
export function pullTethered(draft: Draft, targetId: PlayerId, steps: number): void {
  for (const tether of draft.elementals.tethers.filter((candidate) => candidate.target === targetId)) {
    const owner = playerIn(draft, tether.owner);
    const tiles = Math.floor(steps * tether.share);
    if (tiles <= 0) continue;
    const { path } = clipAtWalls(draft, owner.id, walkPath(draft.state.board, owner.position, tiles, owner.realmEntry));
    if (path.length === 0) continue;
    updatePlayer(draft, owner.id, () => ({ position: path.at(-1) ?? owner.position }));
    draft.events.push({ type: "tetherPulled", playerId: owner.id, targetId, path });
  }
}

export function enchantDie(draft: Draft, playerId: PlayerId, multiplier: number, push: number): void {
  updatePlayer(draft, playerId, (player) => ({ tenzai: { ...player.tenzai, combustion: { multiplier, push } } }));
  draft.events.push({ type: "combustionReady", playerId, multiplier });
}

export function armBreeze(draft: Draft, owner: PlayerId, doubled: boolean): void {
  const breezes = draft.elementals.breezes.filter((breeze) => breeze.owner !== owner);
  draft.elementals = { ...draft.elementals, breezes: [...breezes, { owner, doubled }] };
  draft.events.push({ type: "breezeArmed", playerId: owner, doubled });
}

/** The roll's multiplier when his enchanted die shows COMBUSTION_FACE or more; 1 otherwise. */
export function combustionMultiplier(player: Player, face: number): number {
  const { combustion } = player.tenzai;
  return combustion && face >= COMBUSTION_FACE ? combustion.multiplier : 1;
}

/** After an exploding roll: everyone touchable within COMBUSTION_RADIUS of where he stopped is thrown back, and he rolls again. */
export function detonate(draft: Draft, playerId: PlayerId, push: number): void {
  const { board } = draft.state;
  const { position } = playerIn(draft, playerId);
  const near = new Set([
    position,
    ...walkPath(board, position, COMBUSTION_RADIUS),
    ...pushPath(board, position, COMBUSTION_RADIUS),
  ]);
  const targets = draft.players.filter(
    (other) =>
      other.id !== playerId &&
      near.has(other.position) &&
      sameSpace(board, other.position, position) &&
      !isUntouchable(other),
  );
  draft.events.push({
    type: "combustionExploded",
    playerId,
    tile: position,
    pushed: targets.map((target) => target.id),
  });
  for (const target of targets) {
    const path = pushPath(board, target.position, push, target.realmEntry);
    draft.events.push({ type: "playerPushed", playerId: target.id, by: playerId, path });
    updatePlayer(draft, target.id, () => ({ position: path.at(-1) ?? target.position }));
  }
  draft.extraTurn = true;
}

/**
 * Before an opponent walks a roll of `value`: an armed breeze of someone else's steals it. The victim stays put
 * (true) and the owner walks it (twice if doubled), his landing doing nothing; a protected victim shrugs it off.
 */
export function stealRoll(draft: Draft, rollerId: PlayerId, value: number): boolean {
  if (value < BREEZE_THRESHOLD) return false;
  const breeze = draft.elementals.breezes.find((candidate) => candidate.owner !== rollerId);
  if (!breeze) return false;
  if (isUntouchable(playerIn(draft, rollerId))) {
    draft.events.push({ type: "breezeResisted", playerId: breeze.owner, victimId: rollerId });
    return false;
  }
  draft.elementals = {
    ...draft.elementals,
    breezes: draft.elementals.breezes.filter((candidate) => candidate !== breeze),
  };
  const owner = playerIn(draft, breeze.owner);
  const tiles = value * (breeze.doubled ? 2 : 1);
  const { path } = clipAtWalls(draft, owner.id, walkPath(draft.state.board, owner.position, tiles, owner.realmEntry));
  updatePlayer(draft, owner.id, () => ({ position: path.at(-1) ?? owner.position }));
  draft.events.push({ type: "breezeStolen", playerId: owner.id, victimId: rollerId, value, path });
  return true;
}

/** One of `owner`'s turns is a round for his bonds. */
export function wearTethers(draft: Draft, owner: PlayerId): void {
  const tethers = draft.elementals.tethers.map((tether) =>
    tether.owner === owner ? { ...tether, turnsLeft: tether.turnsLeft - 1 } : tether,
  );
  for (const tether of tethers.filter((candidate) => candidate.turnsLeft <= 0)) {
    draft.events.push({ type: "tetherSnapped", playerId: tether.owner, targetId: tether.target });
  }
  draft.elementals = { ...draft.elementals, tethers: tethers.filter((tether) => tether.turnsLeft > 0) };
}

/** Primordial Awakening: each new element joins his orbit; all four set off the Convergence. */
export function attune(draft: Draft, playerId: PlayerId, elements: readonly Element[]): void {
  for (const element of elements) {
    const player = playerIn(draft, playerId);
    if (!isTenzai(player) || player.tenzai.orbit.includes(element)) continue;
    const orbit = ELEMENTS.filter((candidate) => candidate === element || player.tenzai.orbit.includes(candidate));
    updatePlayer(draft, playerId, (current) => ({ tenzai: { ...current.tenzai, orbit } }));
    draft.events.push({ type: "elementAttuned", playerId, element, elements: orbit });
  }
  if (playerIn(draft, playerId).tenzai.orbit.length === ELEMENTS.length) converge(draft, playerId);
}

/** The orbit is spent: untouchable for CONVERGENCE_TURNS, the ability ready again and CONVERGENCE_BONUS on this roll. */
function converge(draft: Draft, playerId: PlayerId): void {
  updatePlayer(draft, playerId, (player) => ({
    tenzai: { ...player.tenzai, orbit: [], converged: Math.max(player.tenzai.converged, CONVERGENCE_TURNS) },
    abilityCharge: abilityCycle(player.ability),
    diceBonuses: [...player.diceBonuses, { amount: CONVERGENCE_BONUS, rolls: 1 }],
  }));
  draft.events.push({ type: "convergenceAwakened", playerId, turns: CONVERGENCE_TURNS, bonus: CONVERGENCE_BONUS });
  draft.events.push({ type: "abilityReady", playerId, ability: "fourElements" });
}

/** Mastery of the Four Elements: any element but the one he bent last time. */
export function bendElement(draft: Draft, playerId: PlayerId, { element, wallTile, targetId }: ElementChoice): void {
  const player = playerIn(draft, playerId);
  if (!element || !ELEMENTS.includes(element)) throw new GameRuleError("INVALID_ELEMENT");
  if (element === player.tenzai.lastElement) throw new GameRuleError("ELEMENT_LOCKED");
  if (element === "water") {
    const target = tetherTargets(draft.state.board, draft.players, playerId).find((other) => other.id === targetId);
    if (!target) throw new GameRuleError("INVALID_TARGET");
    updatePlayer(draft, playerId, (current) => ({ tenzai: { ...current.tenzai, lastElement: element } }));
    draft.events.push({ type: "elementBent", playerId, element });
    const aim = aimAbility(draft, playerId, target, "fourElements");
    if (aim) bindTether(draft, aim.by, aim.at, TETHER_TURNS);
    attune(draft, playerId, [element]);
    return;
  }
  updatePlayer(draft, playerId, (current) => ({ tenzai: { ...current.tenzai, lastElement: element } }));
  draft.events.push({ type: "elementBent", playerId, element });
  if (element === "earth") raiseWall(draft, playerId, wallTile, WALL_HP);
  else if (element === "fire") enchantDie(draft, playerId, COMBUSTION_MULTIPLIER, COMBUSTION_PUSH);
  else armBreeze(draft, playerId, false);
  attune(draft, playerId, [element]);
}

/** The elements he may bend now: all but the last one, and water only with someone to bind. */
export function bendableElements(
  board: Board,
  players: readonly Player[],
  player: Player,
  elementals: Elementals,
): Element[] {
  return ELEMENTS.filter((element) => {
    if (element === player.tenzai.lastElement) return false;
    if (element === "water") return tetherTargets(board, players, player.id).length > 0;
    if (element === "earth") return wallableTiles(board, players, elementals).length > 0;
    return true;
  });
}
