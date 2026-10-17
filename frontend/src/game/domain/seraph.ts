import { getTile } from "./board";
import { DIVINE_CARDS, type CardId } from "./cards";
import { GameRuleError } from "./commands";
import { giveCard, playerIn, updatePlayer, type Draft } from "./draft";
import { grantBlessing } from "./blessings";
import { blastTrapsAhead } from "./newcomerAbilities";
import { aimWard } from "./players";
import type { Board, Player, PlayerId, TileId, TimedBlessing } from "./types";

/**
 * Seraphiel (the Seraph Guardian, ability seraphBlessing) and his fall.
 * - In heaven he is at home: on a blessing tile he picks which of heaven's blessings he receives,
 *   on a relic tile which of the divine cards (see PendingGrace). His blessings last
 *   SERAPH_BLESSING_TURNS rounds instead of BLESSING_TURNS (see blessings.ts).
 * - Coming out of heaven he wears the Seraphic Crown: CROWN_BONUS tiles on every roll, for the
 *   rest of the match.
 * - The Fall: the moment he sets foot in hell he becomes the Fallen Angel, for good. His blessings
 *   are gone and his crown turns infernal (still CROWN_BONUS a roll, crowned or not before);
 *   hell's tiles can't touch him any more, but heaven is closed to him (a celestial portal does
 *   nothing but chain him there for DIVINE_CHAINS_ROUNDS rounds), and his ability becomes Hell's Drag.
 */

/** Tiles the crown (seraphic or infernal) adds to every roll. */
export const CROWN_BONUS = 2;
/** Rounds heaven's chains hold the Fallen Angel when he stops on a celestial portal (turns he loses). */
export const DIVINE_CHAINS_ROUNDS = 3;
/** Alone on the board, the traps ahead Hell's Drag swallows instead. */
export const DRAG_TRAPS = 2;

/** Heaven's blessings Seraphiel may pick from on a blessing tile. */
export const GRACE_BLESSINGS: readonly TimedBlessing[] = ["wings", "halo", "inspiration", "spring"];

/** Seraphiel, still an angel. */
export function isSeraph(player: Player): boolean {
  return player.ability === "seraphBlessing";
}

/** Seraphiel after the Fall. */
export function isFallen(player: Player): boolean {
  return player.ability === "hellsDrag";
}

export function inHell(board: Board, position: TileId): boolean {
  return getTile(board, position).track?.realm === "infernal";
}

/** On a realm track, heaven or hell. */
function inRealm(board: Board, position: TileId): boolean {
  return getTile(board, position).track !== undefined;
}

/** The Fall: Seraphiel is in hell and becomes the Fallen Angel (nothing happens to anyone else, or twice). */
export function fallIfInHell(draft: Draft, playerId: PlayerId): void {
  const player = playerIn(draft, playerId);
  if (!isSeraph(player) || !inHell(draft.state.board, player.position)) return;
  updatePlayer(draft, playerId, () => ({
    ability: "hellsDrag",
    blessings: [],
    crown: "infernal",
  }));
  draft.events.push({ type: "seraphFell", playerId, tile: player.position });
}

/**
 * After every command: Seraphiel coming out of heaven (in heaven as it started, not any more) is
 * crowned, and in hell, however he got there, falls.
 */
export function crownAndFall(draft: Draft): void {
  const { board } = draft.state;
  for (const before of draft.state.players) {
    const player = playerIn(draft, before.id);
    if (!isSeraph(player)) continue;
    const leftHeaven =
      getTile(board, before.position).track?.realm === "celestial" &&
      getTile(board, player.position).track?.realm !== "celestial";
    if (leftHeaven && player.crown === null) {
      updatePlayer(draft, player.id, () => ({ crown: "seraphic" }));
      draft.events.push({
        type: "crownGained",
        playerId: player.id,
        crown: "seraphic",
      });
    }
    fallIfInHell(draft, player.id);
  }
}

/** Seraphiel stopped on one of heaven's blessings or relics: he picks what he receives (see PendingGrace). */
export function offerGrace(draft: Draft, playerId: PlayerId, tile: TileId, offer: "blessing" | "relic"): void {
  draft.pendingGrace = { tile, offer };
  draft.events.push({ type: "graceOffered", playerId, tile, offer });
}

/** Seraphiel's pick on the tile he was offered it: a blessing for a blessing tile, a divine card for a relic. */
export function receiveGrace(
  draft: Draft,
  playerId: PlayerId,
  tile: TileId,
  offer: "blessing" | "relic",
  pick: { blessing?: TimedBlessing; cardId?: CardId },
): void {
  if (offer === "blessing") {
    if (!pick.blessing || !GRACE_BLESSINGS.includes(pick.blessing)) throw new GameRuleError("INVALID_GRACE");
    grantBlessing(draft, playerId, pick.blessing);
    draft.events.push({
      type: "blessingReceived",
      playerId,
      blessing: pick.blessing,
      tile,
      energyGained: 0,
    });
    return;
  }
  if (!pick.cardId || !DIVINE_CARDS.includes(pick.cardId)) throw new GameRuleError("INVALID_GRACE");
  giveCard(draft, playerId, {
    uid: `${playerId}:relic${draft.state.turn}:${tile}`,
    cardId: pick.cardId,
  });
}

/**
 * The opponents Hell's Drag can be aimed at: anyone not already in heaven or hell (the realms are
 * cut off from the board); none on a board without hell. Armoured ones are listed too: aimed at,
 * they turn it away (see hellsDrag).
 */
export function dragTargets(board: Board, players: readonly Player[], playerId: PlayerId): Player[] {
  if (!board.tracks.some((track) => track.realm === "infernal")) return [];
  return players.filter((player) => player.id !== playerId && !inRealm(board, player.position));
}

/**
 * Hell's Drag: the chosen opponent is pulled down onto hell's first tile and has to walk all of it,
 * but comes out where they were taken from (thrown back from its first tile, they land there too):
 * hell costs them time and its curses, not ground. One Untamed or under armour turns it away: it's
 * spent for nothing. With nobody to pull down, hell swallows the next DRAG_TRAPS traps ahead instead.
 */
export function hellsDrag(draft: Draft, playerId: PlayerId, targetId: PlayerId | undefined): void {
  const { board } = draft.state;
  const targets = dragTargets(board, draft.players, playerId);
  if (targets.length === 0) {
    blastTrapsAhead(draft, playerId, DRAG_TRAPS);
    return;
  }
  const target = targets.find((candidate) => candidate.id === targetId);
  const hell = board.tracks.find((track) => track.realm === "infernal");
  if (!target || !hell) throw new GameRuleError("INVALID_TARGET");
  const ward = aimWard(target);
  if (ward) {
    draft.events.push({
      type: "abilityBlocked",
      playerId,
      targetId: target.id,
      ability: "hellsDrag",
      ward,
    });
    return;
  }

  dragIntoHell(draft, playerId, target.id);
}

/**
 * `targetId` is pulled down onto hell's first tile (Hell's Drag, the Call of the Abyss card). Hell is
 * the price, not lost ground: its way in and out is the very tile they were taken from.
 */
export function dragIntoHell(draft: Draft, playerId: PlayerId, targetId: PlayerId): void {
  const hell = draft.state.board.tracks.find((track) => track.realm === "infernal");
  if (!hell) throw new GameRuleError("INVALID_TARGET");
  const from = playerIn(draft, targetId).position;
  const to = hell.tiles[0];
  updatePlayer(draft, targetId, () => ({
    position: to,
    realmEntry: { portal: from, exit: from },
  }));
  draft.events.push({ type: "hellDragged", playerId, targetId, from, to });
}
