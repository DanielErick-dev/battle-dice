import { getTile } from "./board";
import { drawCard, playerIn, updatePlayer, walkPath, type Draft } from "./draft";
import type { PlayerId, TileId } from "./types";

/**
 * Applies the effect of the tile a player stopped on and leaves them at their final tile.
 * Destinations never chain into another effect.
 */
export function resolveLanding(draft: Draft, playerId: PlayerId, landed: TileId): void {
  const { board } = draft.state;
  const { effect } = getTile(board, landed);
  const moveTo = (position: TileId) => updatePlayer(draft, playerId, () => ({ position }));
  moveTo(landed);

  switch (effect.kind) {
    case "portal":
      draft.events.push({ type: "portalEntered", playerId, from: landed, to: effect.to });
      moveTo(effect.to);
      break;
    case "trap":
      if (playerIn(draft, playerId).shielded) {
        draft.events.push({ type: "trapBlocked", playerId, tile: landed });
        updatePlayer(draft, playerId, () => ({ shielded: false }));
        break;
      }
      draft.events.push({ type: "trapTriggered", playerId, from: landed, to: effect.to });
      moveTo(effect.to);
      break;
    case "advance":
      draft.events.push(
        { type: "advanceTriggered", playerId, from: landed, to: effect.to },
        { type: "playerMoved", playerId, path: walkPath(landed, effect.to - landed, board.finishTile) },
      );
      moveTo(effect.to);
      break;
    case "extraTurn":
      draft.events.push({ type: "extraTurnGranted", playerId, tile: landed });
      draft.extraTurn = true;
      break;
    case "skipTurn":
      draft.events.push({ type: "skipTurnGained", playerId, tile: landed });
      updatePlayer(draft, playerId, (player) => ({ skipTurns: player.skipTurns + 1 }));
      break;
    case "card":
      drawCard(draft, playerId);
      break;
    case "none":
      break;
  }
}
