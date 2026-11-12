import { getTile } from "@/game/domain/board/board";
import { isFrozen } from "@/game/domain/characters/fairy/winter";
import { HIDDEN } from "@/game/domain/core/hidden";
import type { Board, PlayerId, TileEffect, TileId } from "@/game/domain/types";
import type { MatchView } from "@/features/match/model/matchView";
import { BLESSING_CAPTION, CURSE_CAPTION } from "@/features/match/scene/board/tile/theme/captions";
import { SEAL_TEXT, SPECTER_TEXT } from "@/features/match/ui/placementText";
import { CARD_TEXT } from "@/features/match/ui/cards/cardText";

/** A tile the phone lists in place of the glowing tile on the TV's board. */
export interface TileOption {
  tile: TileId;
  /** "Casa 12". */
  title: string;
  /** "Inferno" or "Céu" on a realm track; null on the main path. */
  realm: string | null;
  /** From the viewer's own tile along the main path ("3 à frente"); null when that makes no sense. */
  distance: string | null;
  /** What the tile does and what lies on it, in short words. */
  notes: string[];
  /** Names of who stands there. */
  occupants: string[];
}

const REALM_NAMES = { infernal: "Inferno", celestial: "Céu" } as const;

/** The tile's own effect in a few words; null for a plain tile. */
export function effectNote(effect: TileEffect): string | null {
  switch (effect.kind) {
    case "none":
      return null;
    case "portal":
      return effect.realm ? `Portal para o ${REALM_NAMES[effect.realm]}` : `Portal → casa ${effect.to}`;
    case "trap":
      return `Armadilha: volta à casa ${effect.to}${effect.curse ? ` (${CURSE_CAPTION[effect.curse].toLowerCase()})` : ""}`;
    case "advance":
      return `Avança até a casa ${effect.to}`;
    case "extraTurn":
      return "Joga de novo";
    case "skipTurn":
      return "Perde a vez";
    case "card":
      return effect.cardId ? `Relíquia: ${CARD_TEXT[effect.cardId].name}` : "Compra uma carta";
    case "curse":
      return `Maldição (${CURSE_CAPTION[effect.curse].toLowerCase()})`;
    case "blessing":
      return `Bênção (${BLESSING_CAPTION[effect.blessing].toLowerCase()})`;
  }
}

/** What the match laid on a tile: seals, apparitions, fire, ice, snow, rubble. Hidden kinds stay hidden. */
function coverNotes(view: MatchView, board: Board, tile: TileId, viewerId: PlayerId | null): string[] {
  const notes: string[] = [];
  const nameOf = (id: PlayerId) => view.players.find((player) => player.id === id)?.name ?? "?";
  for (const seal of view.seals.filter((seal) => seal.tile === tile)) {
    notes.push(seal.kind === HIDDEN ? `Selo de ${nameOf(seal.owner)}` : SEAL_TEXT[seal.kind].name);
  }
  for (const specter of view.specters.filter((specter) => specter.tile === tile)) {
    notes.push(specter.owner === viewerId ? SPECTER_TEXT[specter.kind].name : `Aparição de ${nameOf(specter.owner)}`);
  }
  if (view.blackFlames.some((flame) => flame.tile === tile)) notes.push("Fogo negro");
  if (view.scarletFlames.some((flame) => flame.tile === tile)) notes.push("Fogo escarlate");
  if (isFrozen(view.winter, board.startTile, tile)) notes.push("Congelada");
  if (view.enchantedTiles.some((snow) => snow.tile === tile)) notes.push("Neve da fada");
  if (view.voidScars.some((scar) => scar.tile === tile)) notes.push("Marca do Vazio");
  if (view.destroyedTraps.includes(tile)) notes.push("Armadilha destruída");
  if (view.pinnedTraps.includes(tile)) notes.push("Armadilha presa por flechas");
  return notes;
}

function distanceFrom(board: Board, from: TileId | null, tile: TileId): string | null {
  if (from === null || getTile(board, tile).track || getTile(board, from).track) return null;
  // Rifts sit after their tile but carry ids past the board's end, so counting ids would lie.
  if (getTile(board, tile).rift || getTile(board, from).rift) return null;
  const steps = tile - from;
  if (steps === 0) return "a sua casa";
  return steps > 0 ? `${steps} à frente` : `${-steps} atrás`;
}

/** Each pickable tile with what's there, in board order (main path first, then the tracks). */
export function tileOptions(
  tiles: readonly TileId[],
  board: Board,
  view: MatchView,
  viewerId: PlayerId | null,
): TileOption[] {
  const viewer = view.players.find((player) => player.id === viewerId) ?? null;
  return [...tiles]
    .sort((a, b) => a - b)
    .map((tile) => {
      const { effect, track, rift } = getTile(board, tile);
      const effectText = rift ? "Fenda do Vazio" : effectNote(effect);
      return {
        tile,
        title: `Casa ${tile}`,
        realm: track ? REALM_NAMES[track.realm] : null,
        distance: distanceFrom(board, viewer?.position ?? null, tile),
        notes: [...(effectText ? [effectText] : []), ...coverNotes(view, board, tile, viewerId)],
        occupants: view.players.filter((player) => player.position === tile).map((player) => player.name),
      };
    });
}
