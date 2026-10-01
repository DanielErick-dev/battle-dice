import { abilityCycle, PLUNDER_CARDS, SPECTER_RANGE } from "./abilities";
import { MAX_ENERGY } from "./cards";
import { GameRuleError } from "./commands";
import { drawCard, handOverCards, playerIn, updatePlayer, type Draft } from "./draft";
import { sealableTiles } from "./seals";
import type { Board, PendingPlunder, PlayerId, SpecterKind, TileId } from "./types";

/** The apparitions summoned by one use of Spectral Apparitions, in the order their tiles are picked. */
export const SPECTER_KINDS: readonly SpecterKind[] = ["plunder", "hunger"];

/**
 * Tiles an apparition can appear on from `position`: plain main-path tiles within SPECTER_RANGE
 * (as for seals, see sealableTiles), other than those already taken (`taken`: every seal, and
 * other Wardens' apparitions). Nearest first.
 */
export function hauntableTiles(board: Board, position: TileId, taken: readonly TileId[]): TileId[] {
  return sealableTiles(board, position, taken).filter((tile) => Math.abs(tile - position) <= SPECTER_RANGE);
}

/** What keeps `playerId`'s apparitions off a tile: every seal, other Wardens' apparitions. */
export function takenForSpecters(
  seals: readonly { tile: TileId }[],
  specters: readonly { tile: TileId; owner: PlayerId }[],
  playerId: PlayerId,
): TileId[] {
  return [...seals.map((seal) => seal.tile), ...specters.filter((s) => s.owner !== playerId).map((s) => s.tile)];
}

/**
 * Spectral Apparitions: one apparition of each kind on the tiles picked (`tiles[i]` for
 * SPECTER_KINDS[i]). The player's earlier ones fade first.
 */
export function summonSpecters(draft: Draft, playerId: PlayerId, tiles: readonly TileId[]): void {
  const others = draft.specters.filter((specter) => specter.owner !== playerId);
  const allowed = hauntableTiles(
    draft.state.board,
    playerIn(draft, playerId).position,
    takenForSpecters(draft.seals, others, playerId),
  );
  if (
    tiles.length !== SPECTER_KINDS.length ||
    new Set(tiles).size !== tiles.length ||
    tiles.some((tile) => !allowed.includes(tile))
  ) {
    throw new GameRuleError("INVALID_SPECTERS");
  }
  draft.specters = [...others, ...tiles.map((tile, index) => ({ tile, kind: SPECTER_KINDS[index], owner: playerId }))];
  draft.events.push({ type: "spectersSummoned", playerId, tiles: [...tiles] });
}

/**
 * The player walked `path` (the tiles stepped on, the last one included): every apparition on it
 * strikes them, in the order they're reached, unless they first walk through the Warden it belongs
 * to, which dispels all of that Warden's apparitions. Someone's own apparitions do nothing to them
 * while they have opponents; alone on the board, walking through them rewards their owner.
 */
export function crossSpecters(draft: Draft, playerId: PlayerId, path: readonly TileId[]): void {
  const alone = draft.players.length === 1;
  for (const tile of path) {
    for (const warden of draft.players) {
      if (warden.id === playerId || warden.position !== tile) continue;
      const fading = draft.specters.filter((specter) => specter.owner === warden.id);
      if (fading.length === 0) continue;
      draft.specters = draft.specters.filter((specter) => specter.owner !== warden.id);
      draft.events.push({ type: "spectersDispelled", playerId, owner: warden.id, tiles: fading.map((s) => s.tile) });
    }
    const specter = draft.specters.find(
      (candidate) => candidate.tile === tile && (alone || candidate.owner !== playerId),
    );
    if (!specter) continue;
    draft.specters = draft.specters.filter((candidate) => candidate !== specter);
    if (alone) rewardOwner(draft, specter.owner, specter.kind, tile);
    else strike(draft, playerId, specter.owner, specter.kind, tile);
  }
}

function strike(draft: Draft, playerId: PlayerId, owner: PlayerId, kind: SpecterKind, tile: TileId): void {
  if (kind === "plunder") {
    draft.events.push({
      type: "specterStruck",
      playerId,
      owner,
      tile,
      kind,
      energyTaken: 0,
      energyGained: 0,
      chargeGained: 0,
    });
    // With nothing in hand, there's nothing to take; only one plunder waits at a time.
    if (playerIn(draft, playerId).hand.length > 0 && !draft.plunder && !draft.state.pendingPlunder) {
      draft.plunder = { owner, victim: playerId };
      draft.events.push({ type: "plunderOffered", owner, victim: playerId });
    }
    return;
  }
  const energyTaken = playerIn(draft, playerId).energy;
  const warden = playerIn(draft, owner);
  const energyGained = Math.min(energyTaken, MAX_ENERGY - warden.energy);
  // What the full bar can't hold isn't lost: it pushes the Warden's ability a turn closer.
  const chargeGained =
    energyTaken > energyGained && warden.ability && warden.abilityCharge < abilityCycle(warden.ability) ? 1 : 0;
  updatePlayer(draft, playerId, () => ({ energy: 0 }));
  updatePlayer(draft, owner, (player) => ({
    energy: player.energy + energyGained,
    abilityCharge: player.abilityCharge + chargeGained,
  }));
  draft.events.push({ type: "specterStruck", playerId, owner, tile, kind, energyTaken, energyGained, chargeGained });
}

/** Alone on the board: Plunder draws PLUNDER_CARDS cards, Hunger fills the energy bar. */
function rewardOwner(draft: Draft, owner: PlayerId, kind: SpecterKind, tile: TileId): void {
  const energyGained = kind === "hunger" ? MAX_ENERGY - playerIn(draft, owner).energy : 0;
  updatePlayer(draft, owner, (player) => ({ energy: player.energy + energyGained }));
  draft.events.push({
    type: "specterStruck",
    playerId: owner,
    owner,
    tile,
    kind,
    energyTaken: 0,
    energyGained,
    chargeGained: 0,
  });
  if (kind === "plunder") for (let draw = 0; draw < PLUNDER_CARDS; draw++) drawCard(draft, owner);
}

/**
 * The Warden's pick for a waiting plunder: PLUNDER_CARDS distinct cards from the victim's hand
 * (all of them if they hold fewer), into the Warden's.
 */
export function takePlunder(draft: Draft, pending: PendingPlunder, cardUids: readonly string[]): void {
  const hand = playerIn(draft, pending.victim).hand;
  const cards = cardUids.map((uid) => hand.find((card) => card.uid === uid));
  if (
    new Set(cardUids).size !== cardUids.length ||
    cardUids.length !== Math.min(PLUNDER_CARDS, hand.length) ||
    cards.some((card) => !card)
  ) {
    throw new GameRuleError("UNKNOWN_CARD");
  }
  handOverCards(
    draft,
    pending.victim,
    pending.owner,
    cards.filter((card) => card !== undefined),
  );
}
