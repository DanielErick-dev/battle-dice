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
import { isUntouchable } from "./players";
import type { Board, CardInstance, PlayerId, Seal, SealKind, TileEffect, TileId } from "./types";

/** In the order their tiles are picked. */
export const SEAL_KINDS: readonly SealKind[] = ["tithe", "ruin", "silence", "bloodPact"];

/** Plain regular tiles within SEAL_RANGE, the player's own included; nearest first. */
export function sealableTiles(board: Board, position: TileId, taken: readonly TileId[]): TileId[] {
  const near = [position, ...walkPath(board, position, SEAL_RANGE), ...pushPath(board, position, SEAL_RANGE)];
  return near
    .filter((tile, index) => near.indexOf(tile) === index && !taken.includes(tile))
    .filter((tile) => {
      const { role, effect } = getTile(board, tile);
      return role === "regular" && (effect.kind === "none" || isBoon(effect));
    })
    .sort((a, b) => Math.abs(a - position) - Math.abs(b - position) || a - b);
}

/** Energy and charge tiles only give, so they count as plain. */
function isBoon(effect: TileEffect): boolean {
  return effect.kind === "blessing" && (effect.blessing === "energy" || effect.blessing === "charge");
}

export function sealedTiles(seals: readonly Pick<Seal, "tile">[]): TileId[] {
  return seals.map((seal) => seal.tile);
}

/** Earlier seals stay, piling up until someone breaks them. */
export function writeSeals(draft: Draft, playerId: PlayerId, tiles: readonly TileId[]): void {
  const { board } = draft.state;
  // Not on another seal, nor where an apparition stands.
  const taken = [...sealedTiles(draft.seals), ...draft.specters.map((specter) => specter.tile)];
  const allowed = sealableTiles(board, playerIn(draft, playerId).position, taken);
  const distinct = new Set(tiles);
  if (
    tiles.length !== SEAL_KINDS.length ||
    distinct.size !== tiles.length ||
    tiles.some((tile) => !allowed.includes(tile))
  ) {
    throw new GameRuleError("INVALID_SEALS");
  }
  draft.seals = [...draft.seals, ...tiles.map((tile, index) => ({ tile, kind: SEAL_KINDS[index], owner: playerId }))];
  draft.events.push({ type: "sealsWritten", playerId, tiles: [...tiles] });
}

/** True when a seal broke, so nothing else on the tile resolves; one's own seal waits for an opponent. */
export function breakSeal(draft: Draft, playerId: PlayerId, tile: TileId): boolean {
  const seal = draft.seals.find((candidate) => candidate.tile === tile);
  if (!seal) return false;
  const alone = draft.players.length === 1;
  if (seal.owner === playerId && !alone) return false;
  // Spectral Armour turns the seal away; it stays, waiting for someone else.
  if (!alone && isUntouchable(playerIn(draft, playerId))) {
    draft.events.push({ type: "armourHeld", playerId, tile });
    return false;
  }

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

/** Alone on the board, the Scribe's own seal pays out instead of striking. */
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

/** The dearest card, first in hand order on ties. */
function bestCard(hand: readonly CardInstance[]): CardInstance | undefined {
  return hand.reduce<CardInstance | undefined>(
    (best, card) => (!best || cardCost(card.cardId) > cardCost(best.cardId) ? card : best),
    undefined,
  );
}
