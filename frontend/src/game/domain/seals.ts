import {
  BLOOD_PACT_ENERGY,
  RUIN_PUSH,
  SEAL_RANGE,
  SILENCE_TURNS,
  SOLO_PACT_ENERGY,
  SOLO_RUIN_ADVANCE,
  SOLO_SILENCE_ENERGY,
} from "./abilities";
import { getTile } from "./board";
import { cardCost, MAX_ENERGY } from "./cards";
import { GameRuleError } from "./commands";
import { drawCard, handOverCards, playerIn, pushPath, updatePlayer, walkPath, type Draft } from "./draft";
import { unpinPassed } from "./arrowRain";
import type { Board, CardInstance, PlayerId, Seal, SealKind, TileId } from "./types";

/** The seals written by one use of Forbidden Seals, in the order their tiles are picked. */
export const SEAL_KINDS: readonly SealKind[] = ["tithe", "ruin", "silence", "bloodPact"];

/**
 * Tiles a seal can be written on from `position`: plain tiles of the main path (no effect, not
 * the start or finish, not a realm track) up to SEAL_RANGE tiles ahead or behind, other than the
 * player's own and those already holding a seal (`taken`, someone else's). Nearest first.
 */
export function sealableTiles(board: Board, position: TileId, taken: readonly TileId[]): TileId[] {
  const near = [...walkPath(board, position, SEAL_RANGE), ...pushPath(board, position, SEAL_RANGE)];
  return near
    .filter((tile, index) => near.indexOf(tile) === index && tile !== position && !taken.includes(tile))
    .filter((tile) => {
      const { role, effect } = getTile(board, tile);
      return role === "regular" && effect.kind === "none";
    })
    .sort((a, b) => Math.abs(a - position) - Math.abs(b - position) || a - b);
}

/** Tiles holding another player's seals, where `playerId` can't write. */
export function takenBySealsOf(seals: readonly Pick<Seal, "tile" | "owner">[], playerId: PlayerId): TileId[] {
  return seals.filter((seal) => seal.owner !== playerId).map((seal) => seal.tile);
}

/**
 * Forbidden Seals: one seal of each kind on the tiles picked (`tiles[i]` for SEAL_KINDS[i]), each
 * a tile the player can write on. Seals they wrote before are wiped out first.
 */
export function writeSeals(draft: Draft, playerId: PlayerId, tiles: readonly TileId[]): void {
  const { board } = draft.state;
  const others = draft.seals.filter((seal) => seal.owner !== playerId);
  // Not on another player's seal, nor where an apparition stands.
  const taken = [...takenBySealsOf(others, playerId), ...draft.specters.map((specter) => specter.tile)];
  const allowed = sealableTiles(board, playerIn(draft, playerId).position, taken);
  const distinct = new Set(tiles);
  if (
    tiles.length !== SEAL_KINDS.length ||
    distinct.size !== tiles.length ||
    tiles.some((tile) => !allowed.includes(tile))
  ) {
    throw new GameRuleError("INVALID_SEALS");
  }
  draft.seals = [...others, ...tiles.map((tile, index) => ({ tile, kind: SEAL_KINDS[index], owner: playerId }))];
  draft.events.push({ type: "sealsWritten", playerId, tiles: [...tiles] });
}

/**
 * The player stopped on `tile`: a seal there breaks and strikes them (or, alone on the board,
 * rewards its owner). True when one did, so nothing else on the tile is resolved. Someone's own
 * seal does nothing to them while they have opponents: it stays, waiting for one.
 */
export function breakSeal(draft: Draft, playerId: PlayerId, tile: TileId): boolean {
  const seal = draft.seals.find((candidate) => candidate.tile === tile);
  if (!seal) return false;
  const alone = draft.players.length === 1;
  if (seal.owner === playerId && !alone) return false;

  draft.seals = draft.seals.filter((candidate) => candidate !== seal);
  if (alone) rewardOwner(draft, seal);
  else strikeWithSeal(draft, playerId, seal);
  return true;
}

function strikeWithSeal(draft: Draft, playerId: PlayerId, seal: Seal): void {
  const { owner, kind, tile } = seal;
  const broken = (energyLost = 0, energyGained = 0) =>
    draft.events.push({ type: "sealBroken", playerId, owner, tile, kind, energyLost, energyGained });

  switch (kind) {
    case "tithe": {
      broken();
      const card = bestCard(playerIn(draft, playerId).hand);
      if (card) handOverCards(draft, playerId, owner, [card]);
      return;
    }
    case "ruin": {
      broken();
      const path = pushPath(draft.state.board, tile, RUIN_PUSH);
      draft.events.push({ type: "playerPushed", playerId, by: owner, path });
      updatePlayer(draft, playerId, () => ({ position: path.at(-1) ?? tile }));
      return;
    }
    case "silence":
      broken();
      updatePlayer(draft, playerId, () => ({ silencedTurns: SILENCE_TURNS }));
      return;
    case "bloodPact": {
      const energyLost = Math.min(BLOOD_PACT_ENERGY, playerIn(draft, playerId).energy);
      const energyGained = Math.min(energyLost, MAX_ENERGY - playerIn(draft, owner).energy);
      updatePlayer(draft, playerId, (player) => ({ energy: player.energy - energyLost }));
      updatePlayer(draft, owner, (player) => ({ energy: player.energy + energyGained }));
      broken(energyLost, energyGained);
      return;
    }
  }
}

/** Alone on the board, the Scribe stepping on their own seal: it pays out instead of striking. */
function rewardOwner(draft: Draft, { owner, kind, tile }: Seal): void {
  const gainEnergy = (amount: number) => {
    const energyGained = Math.min(amount, MAX_ENERGY - playerIn(draft, owner).energy);
    updatePlayer(draft, owner, (player) => ({ energy: player.energy + energyGained }));
    return energyGained;
  };
  const broken = (energyGained = 0) =>
    draft.events.push({ type: "sealBroken", playerId: owner, owner, tile, kind, energyLost: 0, energyGained });

  switch (kind) {
    case "tithe":
      broken();
      drawCard(draft, owner);
      return;
    case "ruin": {
      broken();
      const path = walkPath(draft.state.board, tile, SOLO_RUIN_ADVANCE);
      draft.events.push({ type: "playerMoved", playerId: owner, path });
      updatePlayer(draft, owner, () => ({ position: path.at(-1) ?? tile }));
      unpinPassed(draft, path);
      return;
    }
    case "silence":
      broken(gainEnergy(SOLO_SILENCE_ENERGY));
      return;
    case "bloodPact":
      broken(gainEnergy(SOLO_PACT_ENERGY));
      return;
  }
}

/** The most valuable card in a hand (the dearest: cost follows rarity); the first such in hand order. */
function bestCard(hand: readonly CardInstance[]): CardInstance | undefined {
  return hand.reduce<CardInstance | undefined>(
    (best, card) => (!best || cardCost(card.cardId) > cardCost(best.cardId) ? card : best),
    undefined,
  );
}
