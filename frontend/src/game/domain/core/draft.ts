import type {
  BlackFlame,
  CardInstance,
  EnchantedTile,
  GameEvent,
  GameState,
  Player,
  PlayerId,
  Seal,
  Specter,
  Threat,
  TileId,
  Winter,
} from "@/game/domain/types";
import type { RandomSource } from "./random";

/** Mutable working copy the rules write to in sequence; the command then seals it into the next state. */
export interface Draft {
  readonly state: GameState;
  players: Player[];
  events: GameEvent[];
  extraTurn: boolean;
  /** Cards that came to a full hand, in order, each waiting for a discard (see PendingDiscard). */
  overflow: OverflowCard[];
  /** Resolving stops here until the player answers. */
  pendingWard: { tile: TileId; threat: Threat } | null;
  /** Resolving stops here until Seraphiel picks. */
  pendingGrace: { tile: TileId; offer: "blessing" | "relic" } | null;
  hiddenTraps: TileId[];
  destroyedTraps: TileId[];
  pinnedTraps: TileId[];
  seals: Seal[];
  specters: Specter[];
  enchantedTiles: EnchantedTile[];
  blackFlames: BlackFlame[];
  winter: Winter | null;
  /** A Plunder specter caught someone this command; settle turns it into a PendingPlunder. */
  plunder: { owner: PlayerId; victim: PlayerId } | null;
  /** For reshuffles and moving sprung hidden traps. */
  random: RandomSource;
}

export interface OverflowCard {
  playerId: PlayerId;
  card: CardInstance;
}

export function startDraft(state: GameState, random: RandomSource): Draft {
  return {
    state,
    players: [...state.players],
    events: [],
    extraTurn: false,
    overflow: [],
    pendingWard: null,
    pendingGrace: null,
    hiddenTraps: [...state.hiddenTraps],
    destroyedTraps: [...state.destroyedTraps],
    pinnedTraps: [...state.pinnedTraps],
    seals: [...state.seals],
    specters: [...state.specters],
    enchantedTiles: [...state.enchantedTiles],
    blackFlames: [...state.blackFlames],
    winter: state.winter,
    plunder: null,
    random,
  };
}

/** The command sets the turn and pending fields itself. */
export function draftState(draft: Draft): GameState {
  return {
    ...draft.state,
    players: draft.players,
    hiddenTraps: draft.hiddenTraps,
    destroyedTraps: draft.destroyedTraps,
    pinnedTraps: draft.pinnedTraps,
    seals: draft.seals,
    specters: draft.specters,
    enchantedTiles: draft.enchantedTiles,
    blackFlames: draft.blackFlames,
    winter: draft.winter,
  };
}

export function playerIn(draft: Draft, playerId: PlayerId): Player {
  const player = draft.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Unknown player ${playerId}`);
  return player;
}

export function updatePlayer(draft: Draft, playerId: PlayerId, patch: (player: Player) => Partial<Player>): void {
  draft.players = draft.players.map((player) => (player.id === playerId ? { ...player, ...patch(player) } : player));
}

export function moveTo(draft: Draft, playerId: PlayerId, position: TileId): void {
  updatePlayer(draft, playerId, () => ({ position }));
}
