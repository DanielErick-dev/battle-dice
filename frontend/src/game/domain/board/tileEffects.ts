import { announceReady, chargeInDraft } from "../abilities/charge";
import { BLESSING_ENERGY } from "./realms";
import { crossSpecters } from "../characters/warden/specters";
import { DIVINE_CHAINS_ROUNDS, isFallen, isSeraph, offerGrace } from "../characters/seraphiel/seraph";
import { drawCard, giveCard } from "../cards/hand";
import { gainEnergy } from "../core/energy";
import { grantBlessing } from "./blessings";
import { loseTurns } from "./harm";
import { moveTo, playerIn, updatePlayer, type Draft } from "../core/draft";
import { unpinPassed } from "../characters/archer/arrowRain";
import { walkPath } from "./paths";
import type { Blessing, PlayerId, TileEffect, TileId } from "@/game/domain/types";

/** What the tile itself does once nothing else on it (fire, snow, seals, wards, harm) has taken over. */
export function applyTileEffect(
  draft: Draft,
  playerId: PlayerId,
  landed: TileId,
  effect: TileEffect,
  { skipping }: { skipping: boolean },
): void {
  const { board } = draft.state;
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
        moveTo(draft, playerId, track.tiles[0]);
        break;
      }
      draft.events.push({ type: "portalEntered", playerId, from: landed, to: effect.to });
      moveTo(draft, playerId, effect.to);
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
      moveTo(draft, playerId, effect.to);
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

function isTimedBlessing(blessing: Blessing): boolean {
  return blessing !== "energy" && blessing !== "charge" && blessing !== "shield";
}

function applyBlessing(draft: Draft, playerId: PlayerId, tile: TileId, blessing: Blessing): void {
  if (blessing === "charge") {
    const { gained, becameReady } = chargeInDraft(draft, playerId, 1, { fromBoard: true });
    draft.events.push({ type: "blessingReceived", playerId, blessing, tile, energyGained: 0, charged: gained > 0 });
    if (becameReady) announceReady(draft, playerId);
    return;
  }
  if (blessing !== "energy") {
    if (blessing === "shield") updatePlayer(draft, playerId, () => ({ shielded: true }));
    else grantBlessing(draft, playerId, blessing);
    draft.events.push({ type: "blessingReceived", playerId, blessing, tile, energyGained: 0 });
    return;
  }
  const energyGained = gainEnergy(draft, playerId, BLESSING_ENERGY);
  draft.events.push({ type: "blessingReceived", playerId, blessing, tile, energyGained });
}
