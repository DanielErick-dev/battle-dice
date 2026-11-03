import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { pushPath } from "../../board/paths";
import { isSeated, isUntouchable } from "../../core/playerStatus";
import { IMPETUS_PUSH, isAkane, setAblaze } from "../akane/fire";
import type { Player, PlayerId } from "../../core/state";
import type { TileId } from "../../board/types";

/** Own turns, counting the one it's used on. */
export const UNTAMED_TURNS = 3;
export const TRAMPLE_PUSH = 6;

/** Time Warp's reversed rolls are shaken off too. */
export function unleash(draft: Draft, playerId: PlayerId): void {
  updatePlayer(draft, playerId, () => ({ untamed: UNTAMED_TURNS, reversedRolls: 0 }));
  draft.events.push({ type: "untamedUnleashed", playerId, turns: UNTAMED_TURNS });
}

/** How hard a walker knocks those in the way: the Berserker always, Akane under his Impetus (and sets them alight). */
function trampleOf(walker: Player): { push: number; burns: boolean } | null {
  if (walker.ability === "untamed") return { push: TRAMPLE_PUSH, burns: false };
  if (isAkane(walker) && walker.impetusRolls > 0) return { push: IMPETUS_PUSH, burns: true };
  return null;
}

/** A trampler tramples every touchable opponent on the path; playerMoved splits at each. */
export function walkTrampling(draft: Draft, playerId: PlayerId, path: readonly TileId[], dash = false): void {
  const moved = (tiles: readonly TileId[]) =>
    draft.events.push({ type: "playerMoved", playerId, path: tiles, ...(dash && { dash }) });
  const trample = trampleOf(playerIn(draft, playerId));
  if (!trample) {
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
      const knocked = pushPath(draft.state.board, tile, trample.push, victim.realmEntry);
      draft.events.push({
        type: "playerTrampled",
        playerId: victim.id,
        by: playerId,
        tile,
        path: knocked,
        seated: isSeated(victim),
        ...(trample.burns && { burning: true }),
      });
      updatePlayer(draft, victim.id, () => ({ position: knocked.at(-1) ?? tile }));
      if (trample.burns) setAblaze(draft, victim.id, playerId);
    }
  });
  if (walked < path.length) moved(path.slice(walked));
}
