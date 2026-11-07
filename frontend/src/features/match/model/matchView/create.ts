import { currentPlayer } from "@/game/domain/handlers/shared";
import { riftsOf } from "@/game/domain/characters/zarek/void";
import type { GameState } from "@/game/domain/types";
import { NO_FX } from "./fx";
import type { MatchView, SealView, SpecterView } from "./view";

export function createInitialView(state: GameState): MatchView {
  return {
    players: state.players,
    activePlayerId: currentPlayer(state).id,
    movingPlayerId: null,
    lastRoll: null,
    isRolling: false,
    roll: null,
    poweredPlayerId: null,
    effect: null,
    winnerId: state.winnerId,
    fx: NO_FX,
    lastDrawnUid: null,
    pendingDiscard: state.pendingDiscard,
    cardsPlayedThisTurn: state.cardsPlayedThisTurn,
    abilityInUse: state.abilityInUse,
    pendingWard: state.pendingWard,
    pendingGrace: state.pendingGrace,
    destroyedTraps: state.destroyedTraps,
    pinnedTraps: state.pinnedTraps,
    seals: sealViews(state),
    specters: specterViews(state),
    enchantedTiles: state.enchantedTiles,
    blackFlames: state.blackFlames,
    scarletFlames: state.scarletFlames,
    winter: state.winter,
    rifts: riftsOf(state.board),
    voidScars: state.voidScars,
    pendingPlunder: state.pendingPlunder,
    walkEnd: null,
    log: [],
    isAnimating: false,
    turnCount: 0,
    error: null,
  };
}

export function sealViews(state: GameState): SealView[] {
  return state.seals.map(({ tile, owner, kind }) => ({ tile, owner, kind }));
}

export function specterViews(state: GameState): SpecterView[] {
  return state.specters.map(({ tile, owner, kind }) => ({ tile, owner, kind }));
}
