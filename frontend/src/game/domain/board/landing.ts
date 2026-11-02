import { applyTileEffect } from "./tileEffects";
import { breakSeal } from "../characters/scribe/seals";
import { canSwallow, offerSwallow } from "../characters/zarek/void";
import { fallIfInHell, inHell, isFallen } from "../characters/seraphiel/seraph";
import { getTile } from "./board";
import { inSusanoo } from "../core/playerStatus";
import { isBlessed } from "./blessings";
import { moveHiddenTrap, strike, strikeScar, threatAt } from "./harm";
import { moveTo, playerIn, type Draft } from "../core/draft";
import { repelledBySusanoo, scorch, sweptBySusanoo } from "../characters/kage/flames";
import { stirEnchantment } from "../characters/fairy/winter";
import type { PlayerId, Threat, TileId } from "@/game/domain/types";

/** Destinations never chain into another effect; a ward prompt pauses resolving until resolveWard. */
export function resolveLanding(draft: Draft, playerId: PlayerId, landed: TileId): void {
  const { board } = draft.state;
  const { effect, rift } = getTile(board, landed);
  moveTo(draft, playerId, landed);

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
  // The Void's purple mark has taken the tile over: only its harm is there, and never for Zarek.
  const scar = draft.voidScars.find((candidate) => candidate.tile === landed);
  if (scar) {
    strikeScar(draft, playerId, scar);
    return;
  }

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
  applyTileEffect(draft, playerId, landed, effect, { skipping });
}
