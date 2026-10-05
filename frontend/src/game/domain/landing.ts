import { isAbilityReady } from "./abilities";
import { getTile } from "./board";
import { MAX_ENERGY } from "./cards";
import { drawCard, giveCard, playerIn, pushPath, updatePlayer, walkPath, type Draft } from "./draft";
import { grantBlessing, isBlessed } from "./blessings";
import { throwOnPile } from "./deck";
import { HIDDEN_TRAP_PUSH, destroyTrap, relocateHiddenTrap } from "./hiddenTraps";
import { unpinPassed } from "./arrowRain";
import { BLESSING_ENERGY } from "./realms";
import { stirEnchantment } from "./fairy";
import { scorch } from "./kunoichi";
import { breakSeal } from "./seals";
import { crossSpecters } from "./specters";
import type { Blessing, Player, PlayerId, Threat, TileId, TrapCurse } from "./types";

/** Energy a draining trap takes. */
export const TRAP_DRAIN_ENERGY = 2;

/**
 * Applies the effect of the tile a player stopped on and leaves them at their final tile.
 * Destinations never chain into another effect. A trap or curse (hidden traps first) may
 * instead stop resolving to ask whether the player spends their Trap Ward on it (see
 * `draft.pendingWard`); `resolveWard` finishes it with their answer. A levitating player
 * (see Player.levitating) just stays on the tile. Black fire smothers the tile while it burns:
 * it scorches (see kunoichi.ts) and nothing else on the tile happens. An enchanted tile stirs
 * instead of anything else (see fairy.ts); otherwise a seal on the tile breaks first (see seals.ts).
 */
export function resolveLanding(draft: Draft, playerId: PlayerId, landed: TileId): void {
  const { board } = draft.state;
  const { effect } = getTile(board, landed);
  const moveTo = (position: TileId) => updatePlayer(draft, playerId, () => ({ position }));
  moveTo(landed);

  // Floating: nothing on the tile touches them. A hidden trap stays where it is, unrevealed.
  if (playerIn(draft, playerId).levitating > 0) {
    if (effect.kind !== "none" && !draft.destroyedTraps.includes(landed)) {
      draft.events.push({ type: "levitatedOver", playerId, tile: landed });
    }
    return;
  }

  // Under black fire the tile is gone for now: only the fire is there.
  if (draft.blackFlames.some((flame) => flame.tile === landed)) {
    scorch(draft, playerId, landed);
    return;
  }
  // An enchanted tile has lost its harm for good: it stirs instead.
  if (stirEnchantment(draft, playerId, landed)) return;
  // A seal written here breaks first; whatever else is on the tile (a hidden trap) waits.
  if (breakSeal(draft, playerId, landed)) return;

  const threat = threatAt(draft, landed);
  // Heaven's Halo keeps the harm off: no need to spend a ward on it.
  if (threat && isBlessed(playerIn(draft, playerId), "halo")) {
    if (threat === "hiddenTrap") moveHiddenTrap(draft, landed);
    draft.events.push({ type: "trapBlocked", playerId, tile: landed, ward: "halo", hidden: threat === "hiddenTrap" });
    return;
  }
  if (threat) {
    if (canWard(playerIn(draft, playerId))) {
      draft.pendingWard = { tile: landed, threat };
      draft.events.push({
        type: "wardOffered",
        playerId,
        tile: landed,
        threat,
      });
      return;
    }
    strike(draft, playerId, landed, threat);
    return;
  }

  switch (effect.kind) {
    case "portal": {
      const track = effect.realm ? board.tracks.find((candidate) => candidate.portal === landed) : undefined;
      if (track) {
        draft.events.push({
          type: "realmEntered",
          playerId,
          realm: track.realm,
          from: landed,
          to: track.tiles[0],
        });
        moveTo(track.tiles[0]);
        break;
      }
      draft.events.push({
        type: "portalEntered",
        playerId,
        from: landed,
        to: effect.to,
      });
      moveTo(effect.to);
      break;
    }
    case "blessing":
      applyBlessing(draft, playerId, landed, effect.blessing);
      break;
    case "advance": {
      const path = walkPath(board, landed, effect.to - landed);
      draft.events.push(
        { type: "advanceTriggered", playerId, from: landed, to: effect.to },
        { type: "playerMoved", playerId, path },
      );
      crossSpecters(draft, playerId, path);
      moveTo(effect.to);
      unpinPassed(draft, path);
      break;
    }
    case "extraTurn":
      draft.events.push({ type: "extraTurnGranted", playerId, tile: landed });
      draft.extraTurn = true;
      break;
    case "skipTurn":
      draft.events.push({ type: "skipTurnGained", playerId, tile: landed });
      updatePlayer(draft, playerId, (player) => ({
        skipTurns: player.skipTurns + 1,
      }));
      break;
    case "card":
      // A relic of heaven is that very card, a fresh copy each time; any other card tile draws.
      if (effect.cardId)
        giveCard(draft, playerId, { uid: `${playerId}:relic${draft.state.turn}:${landed}`, cardId: effect.cardId });
      else drawCard(draft, playerId);
      break;
    case "trap":
    case "curse":
    case "none":
      break;
  }
}

/**
 * Finishes a landing that waited on the ward prompt: the threat strikes, or is warded off and a
 * trap (hidden or not) smashed for good. A curse isn't a trap and stays.
 */
export function resolveWard(draft: Draft, playerId: PlayerId, tile: TileId, threat: Threat, use: boolean): void {
  if (!use) {
    strike(draft, playerId, tile, threat);
    return;
  }
  const player = playerIn(draft, playerId);
  updatePlayer(draft, playerId, () => ({ abilityCharge: 0 }));
  const hidden = threat === "hiddenTrap";
  draft.events.push({
    type: "abilityUsed",
    playerId,
    ability: player.ability ?? "trapWard",
  });
  if (threat !== "curse") destroyTrap(draft, playerId, tile, hidden);
  draft.events.push({ type: "trapBlocked", playerId, tile, ward: "ability", hidden });
}

/**
 * What harmful thing is on the tile: a hidden trap, a trap or a curse; null for none (or
 * smashed, or pinned down by Arrow Rain for now).
 */
export function threatAt(draft: Draft, tile: TileId): Threat | null {
  if (draft.pinnedTraps.includes(tile)) return null;
  if (draft.enchantedTiles.some((enchanted) => enchanted.tile === tile)) return null;
  if (draft.hiddenTraps.includes(tile)) return "hiddenTrap";
  if (draft.destroyedTraps.includes(tile)) return null;
  const { kind } = getTile(draft.state.board, tile).effect;
  return kind === "trap" || kind === "curse" ? kind : null;
}

/**
 * The player is asked about their Trap Ward whenever it's charged, shielded or not: they may
 * rather keep the Arcane Shield (and smash the trap), or let the shield take the hit.
 */
function canWard(player: Player): boolean {
  return player.ability === "trapWard" && isAbilityReady(player);
}

/**
 * The threat hits the player. The Arcane Shield blocks traps (and is used up); curses go
 * through it. A hidden trap moves elsewhere in its zone once found, blocked or not.
 */
function strike(draft: Draft, playerId: PlayerId, tile: TileId, threat: Threat): void {
  const { board } = draft.state;
  const effect = getTile(board, tile).effect;

  if (threat === "curse") {
    if (effect.kind === "curse") applyCurse(draft, playerId, effect.curse);
    return;
  }

  if (threat === "hiddenTrap") moveHiddenTrap(draft, tile);
  if (playerIn(draft, playerId).shielded) {
    updatePlayer(draft, playerId, () => ({ shielded: false }));
    draft.events.push({
      type: "trapBlocked",
      playerId,
      tile,
      ward: "shield",
      hidden: threat === "hiddenTrap",
    });
    return;
  }

  if (threat === "hiddenTrap") {
    const to = pushPath(board, tile, HIDDEN_TRAP_PUSH).at(-1) ?? tile;
    draft.events.push({ type: "hiddenTrapSprung", playerId, tile, to });
    updatePlayer(draft, playerId, () => ({ position: to }));
    return;
  }
  if (effect.kind !== "trap") return;
  draft.events.push({
    type: "trapTriggered",
    playerId,
    from: tile,
    to: effect.to,
  });
  updatePlayer(draft, playerId, () => ({ position: effect.to }));
  if (effect.curse) applyCurse(draft, playerId, effect.curse);
}

function moveHiddenTrap(draft: Draft, tile: TileId): void {
  draft.hiddenTraps = relocateHiddenTrap(
    draft.state.board,
    draft.hiddenTraps,
    tile,
    draft.random,
    draft.destroyedTraps,
  );
}

/** A cursed trap throws away a random card from the hand, or drains energy. */
function applyCurse(draft: Draft, playerId: PlayerId, curse: TrapCurse): void {
  const player = playerIn(draft, playerId);

  if (curse === "discard") {
    const card = player.hand.length > 0 ? player.hand[Math.floor(draft.random() * player.hand.length)] : null;
    if (card) {
      updatePlayer(draft, playerId, (current) => ({
        hand: current.hand.filter((candidate) => candidate.uid !== card.uid),
        discard: throwOnPile(current.discard, [card]),
      }));
    }
    draft.events.push({
      type: "trapCursed",
      playerId,
      curse,
      card,
      energyLost: 0,
    });
    return;
  }

  const energyLost = Math.min(TRAP_DRAIN_ENERGY, player.energy);
  updatePlayer(draft, playerId, (current) => ({
    energy: current.energy - energyLost,
  }));
  draft.events.push({
    type: "trapCursed",
    playerId,
    curse,
    card: null,
    energyLost,
  });
}

/**
 * A blessing tile gives energy (up to the maximum), raises the Arcane Shield or, in heaven, lays one
 * of its timed blessings on the player (see blessings.ts).
 */
function applyBlessing(draft: Draft, playerId: PlayerId, tile: TileId, blessing: Blessing): void {
  if (blessing !== "energy") {
    if (blessing === "shield") updatePlayer(draft, playerId, () => ({ shielded: true }));
    else grantBlessing(draft, playerId, blessing);
    draft.events.push({
      type: "blessingReceived",
      playerId,
      blessing,
      tile,
      energyGained: 0,
    });
    return;
  }
  const energyGained = Math.min(BLESSING_ENERGY, MAX_ENERGY - playerIn(draft, playerId).energy);
  updatePlayer(draft, playerId, (player) => ({
    energy: player.energy + energyGained,
  }));
  draft.events.push({
    type: "blessingReceived",
    playerId,
    blessing,
    tile,
    energyGained,
  });
}
