import { chargeAbility } from "./abilities";
import { getTile } from "./board";
import { MAX_ENERGY } from "./cards";
import { drawCard, giveCard, playerIn, pushPath, updatePlayer, walkPath, type Draft } from "./draft";
import { grantBlessing, isBlessed } from "./blessings";
import { throwOnPile } from "./deck";
import { HIDDEN_TRAP_PUSH, relocateHiddenTrap } from "./hiddenTraps";
import { unpinPassed } from "./arrowRain";
import { BLESSING_ENERGY } from "./realms";
import { stirEnchantment } from "./fairy";
import { repelledBySusanoo, scorch, sweptBySusanoo } from "./kunoichi";
import { inSusanoo } from "./players";
import { breakSeal } from "./seals";
import { DIVINE_CHAINS_ROUNDS, fallIfInHell, inHell, isFallen, isSeraph, offerGrace } from "./seraph";
import { crossSpecters } from "./specters";
import { senseHiddenTraps } from "./verdict";
import { canSwallow, offerSwallow, swallow } from "./void";
import type { Blessing, PlayerId, Threat, TileId, TrapCurse } from "./types";

export const TRAP_DRAIN_ENERGY = 2;

/** Destinations never chain into another effect; a ward prompt pauses resolving until resolveWard. */
export function resolveLanding(draft: Draft, playerId: PlayerId, landed: TileId): void {
  const { board } = draft.state;
  const { effect, rift } = getTile(board, landed);
  const moveTo = (position: TileId) => updatePlayer(draft, playerId, () => ({ position }));
  moveTo(landed);

  // Kage Rubra's Susanoo keeps her tile to herself: thrown back, whatever's on the tile.
  if (repelledBySusanoo(draft, playerId, landed)) return;
  // She herself sweeps anyone off the tile she stops on, then the tile acts on her as usual.
  sweptBySusanoo(draft, playerId, landed);
  // Floating: nothing on the tile touches them. A hidden trap stays where it is, unrevealed.
  if (playerIn(draft, playerId).levitating > 0) {
    if (effect.kind !== "none" && !draft.destroyedTraps.includes(landed)) {
      draft.events.push({ type: "levitatedOver", playerId, tile: landed });
    }
    return;
  }
  fallIfInHell(draft, playerId);

  // Under black fire the tile is gone for now: only the fire is there.
  if (draft.blackFlames.some((flame) => flame.tile === landed)) {
    scorch(draft, playerId, landed);
    return;
  }
  // Snow, or Eternal Winter's ice, has taken the tile's harm for good: it stirs instead.
  if (stirEnchantment(draft, playerId, landed)) return;
  // A seal written here breaks first; whatever else is on the tile (a hidden trap) waits.
  if (breakSeal(draft, playerId, landed)) return;

  const threat = threatAt(draft, landed);
  const skipping = effect.kind === "skipTurn" && !draft.destroyedTraps.includes(landed);
  const harm: Threat | null = threat ?? (skipping ? "skipTurn" : null);
  // A rift never harms the one who opened it; with the Void ready he may swallow it back.
  if (rift?.owner === playerId) {
    if (harm && canSwallow(playerIn(draft, playerId))) offerSwallow(draft, playerId, landed, harm);
    return;
  }
  // Hell is the Fallen Angel's own: its curses, setbacks and lost turns don't touch him.
  if (harm && isFallen(playerIn(draft, playerId)) && inHell(board, landed)) {
    draft.events.push({ type: "trapBlocked", playerId, tile: landed, ward: "fallen", hidden: false });
    return;
  }
  // Untamed: they take the hit and don't even notice. A hidden trap shows itself and moves on.
  if (harm && playerIn(draft, playerId).untamed > 0) {
    if (threat === "hiddenTrap") moveHiddenTrap(draft, landed);
    draft.events.push({
      type: "trapBlocked",
      playerId,
      tile: landed,
      ward: "untamed",
      hidden: threat === "hiddenTrap",
    });
    return;
  }
  // Inside a Susanoo the board's harm can't reach her, all but a hidden trap's spike from below.
  if (harm && harm !== "hiddenTrap" && inSusanoo(playerIn(draft, playerId))) {
    draft.events.push({ type: "trapBlocked", playerId, tile: landed, ward: "susanoo", hidden: false });
    return;
  }
  // Heaven's Halo keeps the harm off: no need to spend a ward on it.
  if (threat && isBlessed(board, playerIn(draft, playerId), "halo")) {
    if (threat === "hiddenTrap") moveHiddenTrap(draft, landed);
    draft.events.push({ type: "trapBlocked", playerId, tile: landed, ward: "halo", hidden: threat === "hiddenTrap" });
    return;
  }
  // Zarek is asked first: he may rather keep the Void's charge (or his Arcane Shield) and take it.
  if (harm && canSwallow(playerIn(draft, playerId))) {
    offerSwallow(draft, playerId, landed, harm);
    return;
  }
  if (threat) {
    strike(draft, playerId, landed, threat);
    return;
  }

  switch (effect.kind) {
    case "portal": {
      const track = effect.realm
        ? board.tracks.find((candidate) => candidate.entries.some((entry) => entry.portal === landed))
        : undefined;
      // Heaven stays shut to the Fallen Angel, and its chains hold him there.
      if (track?.realm === "celestial" && isFallen(playerIn(draft, playerId))) {
        updatePlayer(draft, playerId, (player) => ({
          skipTurns: player.skipTurns + DIVINE_CHAINS_ROUNDS,
          chained: player.chained + DIVINE_CHAINS_ROUNDS,
        }));
        draft.events.push({ type: "heavenBarred", playerId, tile: landed, rounds: DIVINE_CHAINS_ROUNDS });
        break;
      }
      if (track) {
        updatePlayer(draft, playerId, () => ({ realmEntry: { portal: landed, exit: effect.to } }));
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
      draft.events.push({ type: "portalEntered", playerId, from: landed, to: effect.to });
      moveTo(effect.to);
      break;
    }
    case "blessing":
      if (isTimedBlessing(effect.blessing) && isSeraph(playerIn(draft, playerId))) {
        offerGrace(draft, playerId, landed, "blessing");
        break;
      }
      applyBlessing(draft, playerId, landed, effect.blessing);
      break;
    case "advance": {
      const path = walkPath(board, landed, effect.to - landed);
      draft.events.push(
        { type: "advanceTriggered", playerId, from: landed, to: effect.to },
        { type: "playerMoved", playerId, path },
      );
      crossSpecters(draft, playerId, path);
      senseHiddenTraps(draft, playerId, path);
      moveTo(effect.to);
      unpinPassed(draft, path);
      break;
    }
    case "extraTurn":
      draft.events.push({ type: "extraTurnGranted", playerId, tile: landed });
      draft.extraTurn = true;
      break;
    case "skipTurn":
      if (skipping) loseTurns(draft, playerId, landed);
      break;
    case "card":
      // A relic of heaven is that very card, a fresh copy each time; any other card tile draws.
      if (effect.cardId && isSeraph(playerIn(draft, playerId))) offerGrace(draft, playerId, landed, "relic");
      else if (effect.cardId)
        giveCard(draft, playerId, {
          uid: `${playerId}:relic${draft.state.turn}:${landed}`,
          cardId: effect.cardId,
        });
      else drawCard(draft, playerId);
      break;
    case "trap":
    case "curse":
    case "none":
      break;
  }
}

/** Swallowed by the Void, or let through to strike. */
export function resolveWard(draft: Draft, playerId: PlayerId, tile: TileId, threat: Threat, use: boolean): void {
  if (use) swallow(draft, playerId, tile, threat);
  else if (threat === "skipTurn") loseTurns(draft, playerId, tile);
  else strike(draft, playerId, tile, threat);
}

/** A doubled rift takes two. */
function loseTurns(draft: Draft, playerId: PlayerId, tile: TileId): void {
  const turns = getTile(draft.state.board, tile).rift?.doubled ? 2 : 1;
  draft.events.push({ type: "skipTurnGained", playerId, tile, ...(turns > 1 && { turns }) });
  updatePlayer(draft, playerId, (player) => ({ skipTurns: player.skipTurns + turns }));
}

/** Null too when the harm is smashed, pinned by Arrow Rain or enchanted. */
export function threatAt(draft: Draft, tile: TileId): Threat | null {
  if (draft.pinnedTraps.includes(tile)) return null;
  if (draft.enchantedTiles.some((enchanted) => enchanted.tile === tile)) return null;
  if (draft.hiddenTraps.includes(tile)) return "hiddenTrap";
  if (draft.destroyedTraps.includes(tile)) return null;
  const { kind } = getTile(draft.state.board, tile).effect;
  return kind === "trap" || kind === "curse" ? kind : null;
}

/** The Arcane Shield blocks traps but not curses; a found hidden trap moves, blocked or not. */
function strike(draft: Draft, playerId: PlayerId, tile: TileId, threat: Threat): void {
  const { board } = draft.state;
  const effect = getTile(board, tile).effect;

  const curses = getTile(board, tile).rift?.doubled ? 2 : 1;
  if (threat === "curse") {
    if (effect.kind === "curse") for (let curse = 0; curse < curses; curse++) applyCurse(draft, playerId, effect.curse);
    return;
  }

  if (threat === "hiddenTrap") moveHiddenTrap(draft, tile);
  if (playerIn(draft, playerId).shielded) {
    updatePlayer(draft, playerId, () => ({ shielded: false }));
    draft.events.push({ type: "trapBlocked", playerId, tile, ward: "shield", hidden: threat === "hiddenTrap" });
    return;
  }

  if (threat === "hiddenTrap") {
    const to = pushPath(board, tile, HIDDEN_TRAP_PUSH).at(-1) ?? tile;
    draft.events.push({ type: "hiddenTrapSprung", playerId, tile, to });
    updatePlayer(draft, playerId, () => ({ position: to }));
    return;
  }
  if (effect.kind !== "trap") return;
  draft.events.push({ type: "trapTriggered", playerId, from: tile, to: effect.to });
  updatePlayer(draft, playerId, () => ({ position: effect.to }));
  if (effect.curse) for (let curse = 0; curse < curses; curse++) applyCurse(draft, playerId, effect.curse);
}

function isTimedBlessing(blessing: Blessing): boolean {
  return blessing !== "energy" && blessing !== "charge" && blessing !== "shield";
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
    draft.events.push({ type: "trapCursed", playerId, curse, card, energyLost: 0 });
    return;
  }

  const energyLost = Math.min(TRAP_DRAIN_ENERGY, player.energy);
  updatePlayer(draft, playerId, (current) => ({ energy: current.energy - energyLost }));
  draft.events.push({ type: "trapCursed", playerId, curse, card: null, energyLost });
}

function applyBlessing(draft: Draft, playerId: PlayerId, tile: TileId, blessing: Blessing): void {
  if (blessing === "charge") {
    const before = playerIn(draft, playerId);
    const { player: charged, becameReady } = chargeAbility(before, { fromBoard: true });
    updatePlayer(draft, playerId, () => ({ abilityCharge: charged.abilityCharge }));
    draft.events.push({
      type: "blessingReceived",
      playerId,
      blessing,
      tile,
      energyGained: 0,
      charged: charged.abilityCharge > before.abilityCharge,
    });
    if (becameReady && charged.ability) draft.events.push({ type: "abilityReady", playerId, ability: charged.ability });
    return;
  }
  if (blessing !== "energy") {
    if (blessing === "shield") updatePlayer(draft, playerId, () => ({ shielded: true }));
    else grantBlessing(draft, playerId, blessing);
    draft.events.push({ type: "blessingReceived", playerId, blessing, tile, energyGained: 0 });
    return;
  }
  const energyGained = Math.min(BLESSING_ENERGY, MAX_ENERGY - playerIn(draft, playerId).energy);
  updatePlayer(draft, playerId, (player) => ({ energy: player.energy + energyGained }));
  draft.events.push({ type: "blessingReceived", playerId, blessing, tile, energyGained });
}
