/** Who the camera swings round to film from the front: a figure playing one of its own moves. */
import type { MatchView } from "../model/matchView";
import { effectKey } from "./effectKey";

/** A move worth seeing from the front: how close to film it (share of the follow distance) and for how long. */
export interface SpotlightShot {
  /** Changes with every new move, so each one gets its shot once. */
  key: string;
  playerId: string;
  distance: number;
  seconds: number;
  /** Radians above the horizon, when higher than the usual chest shot (CameraRig's SPOT_ELEVATION). */
  elevation?: number;
}

/** Ability casts, Themis turning an attack away, the Berserker's shove, a lost turn thrown at someone and the Fall. */
export function spotlightOf(view: MatchView): SpotlightShot | null {
  const { effect } = view;
  const { trample, verdict } = view.fx;
  // Her scale stands beside her: pulled back so it shows too.
  if (verdict && effect?.kind === "verdict")
    return { key: `verdict${verdict.id}`, playerId: verdict.judgeId, distance: 1.4, seconds: 4, elevation: 0.7 };
  if (trample && !trample.susanoo && trample.phase === "shove")
    return { key: `shove${trample.id}`, playerId: trample.by, distance: 0.7, seconds: 1.6 };
  if (effect?.kind === "abilityUsed")
    return { key: `cast${effectKey(effect)}`, playerId: effect.playerId, distance: 0.6, seconds: 2.6 };
  // A lost turn thrown at them: seen from the front as they sit down to wait.
  if (effect?.kind === "skipTurn" && effect.aimed)
    return { key: `benched${effectKey(effect)}`, playerId: effect.playerId, distance: 0.7, seconds: 2.6 };
  if (effect?.kind === "fallen")
    return { key: `fall${effectKey(effect)}`, playerId: effect.playerId, distance: 0.65, seconds: 2.4 };
  return null;
}
