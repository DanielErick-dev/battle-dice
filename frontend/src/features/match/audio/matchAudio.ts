import type { MatchView, TileEffectKind } from "../model/matchView";
import type { MatchSounds } from "./soundEffects";

interface ViewSource {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => MatchView;
}

/**
 * Plays sounds for what changes on screen, by diffing consecutive views. Driving audio
 * from the view (not from game events) keeps it in sync with the animation.
 */
export function connectMatchAudio(source: ViewSource, sounds: MatchSounds): () => void {
  let previous = source.getSnapshot();

  return source.subscribe(() => {
    const next = source.getSnapshot();
    if (next !== previous) playTransition(previous, next, sounds);
    previous = next;
  });
}

const EFFECT_SOUNDS: Record<TileEffectKind, (sounds: MatchSounds) => void> = {
  portal: (sounds) => sounds.portal(),
  trap: (sounds) => sounds.trap(),
  advance: (sounds) => sounds.boost(),
  extraTurn: (sounds) => sounds.bonus(),
  skipTurn: (sounds) => sounds.penalty(),
  turnSkipped: (sounds) => sounds.penalty(),
  trapBlocked: (sounds) => sounds.shieldBlock(),
  teleport: (sounds) => sounds.portal(),
};

export function playTransition(previous: MatchView, next: MatchView, sounds: MatchSounds): void {
  // Die impacts come from the 3D throw itself (see DiceThrow), in sync with each bounce.
  if (!previous.isRolling && next.isRolling) sounds.diceShake();
  if (next.poweredPlayerId !== null && next.poweredPlayerId !== previous.poweredPlayerId) sounds.powerUp();

  if (next.effect && next.effect !== previous.effect) EFFECT_SOUNDS[next.effect.kind](sounds);
  if (next.cast && next.cast.id !== previous.cast?.id) sounds.cardCast(next.cast.card.cardId);
  if (next.lastDrawnUid !== null && next.lastDrawnUid !== previous.lastDrawnUid) sounds.cardDraw();

  for (const player of next.players) {
    const before = previous.players.find((other) => other.id === player.id);
    if (!before || before.position === player.position) continue;

    const effect = next.effect;
    const isTeleport =
      (effect?.kind === "portal" || effect?.kind === "trap" || effect?.kind === "teleport") &&
      effect.playerId === player.id &&
      effect.to === player.position;
    if (isTeleport || Math.abs(player.position - before.position) > 1) sounds.leap();
    else sounds.step();
  }

  if (previous.winnerId === null && next.winnerId !== null) sounds.win();
}
