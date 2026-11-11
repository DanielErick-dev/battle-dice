import { FLAME_TURNS } from "../kage/flames";
import { getTile, linkRift } from "../../board/board";
import { inHellTrack } from "../../board/tileGround";
import { GameRuleError } from "../../core/errors";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { VOID_DOUBLE_ENERGY, isHarm } from "./void";
import { draftView, harmGround, spellGround } from "./ground";
import { openRift } from "./rifts";
import type { VoidSpell } from "./types";
import type { Board, TileId } from "../../board/types";
import type { PlayerId } from "../../core/state";

/** A harm opens a new tile into the path; a spell is set on a free tile, now Zarek's own. */
export function placeVoid(
  draft: Draft,
  playerId: PlayerId,
  { index, tile, doubled = false }: { index: number; tile: TileId; doubled?: boolean },
): Board {
  const player = playerIn(draft, playerId);
  const item = player.voidHold[index];
  if (player.ability !== "theVoid" || !item) throw new GameRuleError("INVALID_VOID");
  const { board } = draft.state;

  if (!isHarm(item)) {
    if (doubled || !spellGround(draftView(draft)).includes(tile)) throw new GameRuleError("INVALID_VOID");
    release(draft, playerId, index);
    castSpell(draft, playerId, item, tile);
    draft.events.push({ type: "voidCast", playerId, tile, item });
    return board;
  }

  if (!harmGround(draftView(draft)).includes(tile)) throw new GameRuleError("INVALID_VOID");
  if (doubled && player.energy < VOID_DOUBLE_ENERGY) throw new GameRuleError("NOT_ENOUGH_ENERGY");
  release(draft, playerId, index);
  if (doubled) updatePlayer(draft, playerId, (current) => ({ energy: current.energy - VOID_DOUBLE_ENERGY }));
  if (inHellTrack(getTile(board, tile))) {
    draft.voidScars = [...draft.voidScars, { tile, owner: playerId, harm: item, doubled }];
    draft.events.push({ type: "voidCast", playerId, tile, item });
    return board;
  }
  const rift = openRift(board, tile, playerId, item, doubled);
  const linked = linkRift(board, rift);
  draft.events.push({ type: "riftOpened", playerId, rift: getTile(linked, rift.id) });
  return linked;
}

function release(draft: Draft, playerId: PlayerId, index: number): void {
  updatePlayer(draft, playerId, (player) => ({ voidHold: player.voidHold.filter((_, held) => held !== index) }));
}

function castSpell(draft: Draft, owner: PlayerId, item: VoidSpell, tile: TileId): void {
  switch (item.kind) {
    case "flame":
      draft.blackFlames = [...draft.blackFlames, { tile, owner, turnsLeft: FLAME_TURNS, hits: 0 }];
      return;
    case "snow":
      draft.enchantedTiles = [...draft.enchantedTiles, { tile, owner }];
      return;
    case "seal":
      draft.seals = [...draft.seals, { tile, kind: item.seal, owner }];
      return;
    case "specter":
      draft.specters = [...draft.specters, { tile, kind: item.specter, owner }];
      return;
  }
}
