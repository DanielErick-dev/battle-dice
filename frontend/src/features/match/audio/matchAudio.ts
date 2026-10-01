import { DEFAULT_TIMINGS } from "../config";
import type { MatchView, TileEffectKind, TileEffectView } from "../model/matchView";
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

const EFFECT_SOUNDS: Record<TileEffectKind, (sounds: MatchSounds, effect: TileEffectView) => void> = {
  portal: (sounds) => sounds.portal(),
  trap: (sounds) => sounds.trap(),
  hiddenTrap: (sounds) => sounds.trap(),
  advance: (sounds) => sounds.boost(),
  extraTurn: (sounds) => sounds.bonus(),
  skipTurn: (sounds) => sounds.penalty(),
  turnSkipped: (sounds) => sounds.penalty(),
  trapBlocked: (sounds) => sounds.shieldBlock(),
  trapCurse: (sounds) => sounds.penalty(),
  realmEnter: (sounds, effect) => sounds.realmGate(effect.realm ?? "infernal"),
  blessing: (sounds) => sounds.bonus(),
  teleport: (sounds) => sounds.portal(),
  abilityReady: (sounds) => sounds.bonus(),
  abilityUsed: (sounds) => sounds.powerUp(),
  levitated: (sounds) => sounds.shieldBlock(),
  gamble: (sounds, effect) => (effect.gamble?.won ? sounds.bonus() : sounds.penalty()),
  // Breaking one's own seal (alone on the board) pays out; anyone else's strikes.
  seal: (sounds, effect) => (effect.seal?.owner === effect.playerId ? sounds.bonus() : sounds.trap()),
  // Dispelled apparitions fade like a blocked trap; a struck one hits (or, alone, pays out).
  specter: (sounds, effect) =>
    !effect.specter?.kind
      ? sounds.shieldBlock()
      : effect.specter.owner === effect.playerId
        ? sounds.bonus()
        : sounds.penalty(),
};

export function playTransition(previous: MatchView, next: MatchView, sounds: MatchSounds): void {
  // Die impacts come from the 3D throw itself (see DiceThrow), in sync with each bounce.
  if (!previous.isRolling && next.isRolling) sounds.diceShake();
  if (next.poweredPlayerId !== null && next.poweredPlayerId !== previous.poweredPlayerId) sounds.powerUp();

  // Dormant Fury: a whine as the player throws themselves forward, thunder as the lightning takes them,
  // and again as it lets them go.
  if (next.dash && next.dash.id !== previous.dash?.id) {
    sounds.electricRush(DEFAULT_TIMINGS.dashLaunchMs / 1000);
    sounds.thunder(DEFAULT_TIMINGS.dashLaunchMs / 1000);
  }
  if (next.dash?.arrived && !previous.dash?.arrived) sounds.thunder();
  if (next.volley && next.volley.id !== previous.volley?.id) sounds.arrowVolley(DEFAULT_TIMINGS.arrowVolleyMs / 1000);
  if (next.effect && next.effect !== previous.effect) EFFECT_SOUNDS[next.effect.kind](sounds, next.effect);
  if (next.cast && next.cast.id !== previous.cast?.id) sounds.cardCast(next.cast.card.cardId);
  if (next.drawing && next.drawing.id !== previous.drawing?.id) sounds.cardFlip();
  if (next.lastDrawnUid !== null && next.lastDrawnUid !== previous.lastDrawnUid) sounds.cardDraw();

  for (const player of next.players) {
    // A lightning dash is heard as thunder, not steps.
    if (next.dash?.playerId === player.id && !next.dash.arrived) continue;
    const before = previous.players.find((other) => other.id === player.id);
    if (!before || before.position === player.position) continue;

    const effect = next.effect;
    const isTeleport =
      (effect?.kind === "portal" ||
        effect?.kind === "trap" ||
        effect?.kind === "hiddenTrap" ||
        effect?.kind === "teleport") &&
      effect.playerId === player.id &&
      effect.to === player.position;
    if (isTeleport || Math.abs(player.position - before.position) > 1) sounds.leap();
    else sounds.step();
  }

  if (previous.winnerId === null && next.winnerId !== null) sounds.win();
}
