import { getTile } from "./board";
import { HIDDEN_TRAP_PUSH, relocateHiddenTrap } from "./hiddenTraps";
import { loseEnergy } from "../core/energy";
import { moveTo, playerIn, updatePlayer, type Draft } from "../core/draft";
import { pushPath } from "./paths";
import { swallow } from "../characters/zarek/void";
import { takeRandomCard } from "../cards/hand";
import type { PlayerId, Threat, TileId, TrapCurse } from "@/game/domain/types";

export const TRAP_DRAIN_ENERGY = 2;

/** Null too when the harm is smashed, pinned by Arrow Rain or enchanted. */
export function threatAt(draft: Draft, tile: TileId): Threat | null {
  if (draft.pinnedTraps.includes(tile)) return null;
  if (draft.enchantedTiles.some((enchanted) => enchanted.tile === tile)) return null;
  if (draft.hiddenTraps.includes(tile)) return "hiddenTrap";
  if (draft.destroyedTraps.includes(tile)) return null;
  const { kind } = getTile(draft.state.board, tile).effect;
  return kind === "trap" || kind === "curse" ? kind : null;
}

/** Swallowed by the Void, or let through to strike. */
export function resolveWard(draft: Draft, playerId: PlayerId, tile: TileId, threat: Threat, use: boolean): void {
  if (use) swallow(draft, playerId, tile, threat);
  else if (threat === "skipTurn") loseTurns(draft, playerId, tile);
  else strike(draft, playerId, tile, threat);
}

/** A doubled rift takes two. */
export function loseTurns(draft: Draft, playerId: PlayerId, tile: TileId): void {
  const turns = getTile(draft.state.board, tile).rift?.doubled ? 2 : 1;
  draft.events.push({ type: "skipTurnGained", playerId, tile, ...(turns > 1 && { turns }) });
  updatePlayer(draft, playerId, (player) => ({ skipTurns: player.skipTurns + turns }));
}

/** The Arcane Shield blocks traps but not curses; a found hidden trap moves, blocked or not. */
export function strike(draft: Draft, playerId: PlayerId, tile: TileId, threat: Threat): void {
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
    moveTo(draft, playerId, to);
    return;
  }
  if (effect.kind !== "trap") return;
  draft.events.push({ type: "trapTriggered", playerId, from: tile, to: effect.to });
  moveTo(draft, playerId, effect.to);
  if (effect.curse) for (let curse = 0; curse < curses; curse++) applyCurse(draft, playerId, effect.curse);
}

/** Found, the hidden trap on `tile` moves elsewhere in its zone. */
export function moveHiddenTrap(draft: Draft, tile: TileId): void {
  draft.hiddenTraps = relocateHiddenTrap(
    draft.state.board,
    draft.hiddenTraps,
    tile,
    draft.random,
    draft.destroyedTraps,
  );
}

function applyCurse(draft: Draft, playerId: PlayerId, curse: TrapCurse): void {
  if (curse === "discard") {
    const card = takeRandomCard(draft, playerId);
    draft.events.push({ type: "trapCursed", playerId, curse, card, energyLost: 0 });
    return;
  }
  const energyLost = loseEnergy(draft, playerId, TRAP_DRAIN_ENERGY);
  draft.events.push({ type: "trapCursed", playerId, curse, card: null, energyLost });
}
