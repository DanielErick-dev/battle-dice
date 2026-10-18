import { TRAMPLE_PUSH, UNTAMED_TURNS } from "./abilities";
import { playerIn, pushPath, updatePlayer, type Draft } from "./draft";
import { isSeated, isUntouchable } from "./players";
import type { PlayerId, TileId } from "./types";

/** Time Warp's reversed rolls are shaken off too. */
export function unleash(draft: Draft, playerId: PlayerId): void {
  updatePlayer(draft, playerId, () => ({ untamed: UNTAMED_TURNS, reversedRolls: 0 }));
  draft.events.push({ type: "untamedUnleashed", playerId, turns: UNTAMED_TURNS });
}

/** The Berserker (Untamed, used or not) tramples every touchable opponent on the path; playerMoved splits at each. */
export function walkTrampling(draft: Draft, playerId: PlayerId, path: readonly TileId[], dash = false): void {
  const moved = (tiles: readonly TileId[]) =>
    draft.events.push({ type: "playerMoved", playerId, path: tiles, ...(dash && { dash }) });
  if (playerIn(draft, playerId).ability !== "untamed") {
    moved(path);
    return;
  }

  let walked = 0;
  path.forEach((tile, index) => {
    const victims = draft.players.filter(
      (player) => player.id !== playerId && player.position === tile && !isUntouchable(player),
    );
    if (victims.length === 0) return;
    moved(path.slice(walked, index + 1));
    walked = index + 1;
    for (const victim of victims) {
      const knocked = pushPath(draft.state.board, tile, TRAMPLE_PUSH, victim.realmEntry);
      draft.events.push({
        type: "playerTrampled",
        playerId: victim.id,
        by: playerId,
        tile,
        path: knocked,
        seated: isSeated(victim),
      });
      updatePlayer(draft, victim.id, () => ({ position: knocked.at(-1) ?? tile }));
    }
  });
  if (walked < path.length) moved(path.slice(walked));
}
