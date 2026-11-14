import { GameRuleError } from "../../core/errors";
import { playerIn, updatePlayer, type Draft } from "../../core/draft";
import { VOID_CAPACITY, VOID_SCAR_BACK } from "./void";
import { draftView, seizableTiles } from "./ground";
import type { VoidItem, VoidScar } from "./types";
import type { TileId } from "../../board/types";
import type { PlayerId } from "../../core/state";

/** The Void absorbs another's spell on `tile` to set down anywhere later; a purple trap of Zarek's is left behind. */
export function seize(draft: Draft, playerId: PlayerId, tile: TileId | undefined): void {
  if (playerIn(draft, playerId).zarek.hold.length >= VOID_CAPACITY) throw new GameRuleError("VOID_FULL");
  const valid = tile !== undefined && seizableTiles(draftView(draft), playerId).includes(tile);
  const item = valid ? absorbSpell(draft, playerId, tile) : null;
  if (tile === undefined || !item) throw new GameRuleError("INVALID_VOID");
  const scar: VoidScar = { tile, owner: playerId, harm: { kind: "trap", back: VOID_SCAR_BACK }, doubled: false };
  draft.voidScars = [...draft.voidScars, scar];
  updatePlayer(draft, playerId, (player) => ({ zarek: { idle: 0, hold: [...player.zarek.hold, item] } }));
  draft.events.push({ type: "voidSeized", playerId, tile, item });
}

function absorbSpell(draft: Draft, owner: PlayerId, tile: TileId): VoidItem | null {
  const take = <T extends { tile: TileId; owner: PlayerId }>(list: readonly T[]) => {
    const found = list.find((entry) => entry.tile === tile && entry.owner !== owner);
    return { found, list: list.filter((entry) => entry !== found) };
  };
  const flame = take(draft.blackFlames);
  if (flame.found) {
    draft.blackFlames = flame.list;
    return { kind: "flame" };
  }
  const snow = take(draft.enchantedTiles);
  if (snow.found) {
    draft.enchantedTiles = snow.list;
    return { kind: "snow" };
  }
  // The fairy's ice leaves her winter and goes into the Void as snow.
  if (draft.winter && draft.winter.owner !== owner && draft.winter.iced.includes(tile)) {
    draft.winter = { ...draft.winter, iced: draft.winter.iced.filter((iced) => iced !== tile) };
    return { kind: "snow" };
  }
  const seal = take(draft.seals);
  if (seal.found) {
    draft.seals = seal.list;
    return { kind: "seal", seal: seal.found.kind };
  }
  const specter = take(draft.specters);
  if (specter.found) {
    draft.specters = specter.list;
    return { kind: "specter", specter: specter.found.kind };
  }
  return null;
}
