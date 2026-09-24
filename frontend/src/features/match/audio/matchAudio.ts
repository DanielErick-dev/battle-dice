import type { MatchView } from "../model/matchView";
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

export function playTransition(previous: MatchView, next: MatchView, sounds: MatchSounds): void {
  if (!previous.isRolling && next.isRolling) sounds.diceShake();
  if (previous.isRolling && !next.isRolling && next.lastRoll !== null) sounds.diceLand();

  if (next.effect && next.effect !== previous.effect) {
    if (next.effect.kind === "portal") sounds.portal();
    else sounds.trap();
  }

  for (const player of next.players) {
    const before = previous.players.find((other) => other.id === player.id);
    if (!before || before.position === player.position) continue;

    const isTeleport = next.effect?.playerId === player.id && next.effect.to === player.position;
    if (isTeleport || Math.abs(player.position - before.position) > 1) sounds.leap();
    else sounds.step();
  }

  if (previous.winnerId === null && next.winnerId !== null) sounds.win();
}
