/** What a figure is acting out each frame: the clip it plays and how its body leans, spins and hides. */
import type { CharacterClip } from "@/features/characters";
import type { Vec3 } from "@/features/shared/board/boardLayout";
import { KNOCKED_LANDING_SECONDS, LUNGE_DISTANCE, LUNGE_SECONDS } from "./trample";
import type { TokenSignals } from "../effects/types";
import { easeInOut, headingOf } from "./motion";
import { sequenceStep } from "./clipSequence";
import type { Pose, PoseInput, TokenActs } from "./poseModel";
import {
  CAST_HOLD_SECONDS,
  CHAIR_AT,
  DASH_VANISH_SECONDS,
  EMERGE_SECONDS,
  HOP_SECONDS,
  LAND_CRACKLE_SECONDS,
  RUN_LINGER_SECONDS,
  SINK_SECONDS,
  VERDICT_CLIPS,
} from "./poseTimings";

/** Steps every act by one frame (in this order: each reads what the ones before it decided) and picks the clip. */
export function stepPose(acts: TokenActs, input: PoseInput): Pose {
  const { now, delta, signals, levitating, traits, lengths, motion } = input;
  const current = motion.segment;
  // Sliding over on its own tile (someone came by), a seated figure stays seated.
  const moving = motion.travelling && current !== null && current.motion !== "slide";
  let heading = input.heading;

  // Out of the dash: the figure drops out of the strike and lands (when it has a land clip).
  let landingAt: number | null = null;
  if (!signals.isDashing) {
    if (acts.dashStartedAt !== null && lengths.land !== undefined) {
      acts.landStartedAt = now;
      landingAt = now;
    }
    acts.dashStartedAt = null;
  } else acts.dashStartedAt ??= now;
  // Throwing itself forward, then taken by the lightning: only the bolt is seen until it lets go.
  const hidden = acts.dashStartedAt !== null && now - acts.dashStartedAt >= DASH_VANISH_SECONDS;
  const launching = acts.dashStartedAt !== null && !hidden;
  const landElapsed = elapsedSince(acts.landStartedAt, now);
  if (landElapsed >= (lengths.land ?? 0) + CAST_HOLD_SECONDS) acts.landStartedAt = null;
  const landed = acts.landStartedAt !== null;
  const crackling = launching || landElapsed < traits.landImpactSeconds + LAND_CRACKLE_SECONDS;

  const sunk = stepDrag(acts, signals.dragged, now, motion.settled);
  const gone = acts.drag?.stage === "gone";

  if (signals.abilityCast !== null && signals.abilityCast !== acts.lastCast) {
    acts.lastCast = signals.abilityCast;
    acts.castStartedAt = now;
  }
  const castClip = lengths.cast;
  // A cast clip's last pose lingers a moment before the figure settles back into its idle.
  const castLength = castClip === undefined ? HOP_SECONDS : castClip + CAST_HOLD_SECONDS;
  const castElapsed = elapsedSince(acts.castStartedAt, now);
  const castProgress = Math.min(1, castElapsed / castLength);
  if (castProgress >= 1) acts.castStartedAt = null;
  const casting = acts.castStartedAt !== null;

  // A trample: Bjorn reaches his spot, turns on them and shoves, then faces the path again.
  let shoveAt: number | null = null;
  if (signals.shove !== acts.lastShove) {
    acts.shovePending = signals.shove !== null;
    if (signals.shove === null) {
      acts.shoveStartedAt = null;
      heading = headingOf(input.path) ?? heading;
    }
  }
  acts.lastShove = signals.shove;
  if (acts.shovePending && motion.settled) {
    acts.shovePending = false;
    acts.shoveStartedAt = now;
    shoveAt = now;
  }
  if (acts.shoveStartedAt !== null) heading = headingOf(negate(input.path)) ?? heading;

  if (signals.knocked !== null && signals.knocked !== acts.lastKnocked) acts.knockedStartedAt = now;
  acts.lastKnocked = signals.knocked;
  // Sent on its way again before it's back on its feet (its own turn): it gets up at once.
  if (signals.knocked === null && current !== null && current.motion !== "leap") acts.knockedStartedAt = null;
  const shoveElapsed = elapsedSince(acts.shoveStartedAt, now);
  const knockedElapsed = elapsedSince(acts.knockedStartedAt, now);
  const knockedLength = Math.max(lengths.knocked ?? 0, KNOCKED_LANDING_SECONDS) + CAST_HOLD_SECONDS;
  if (knockedElapsed >= knockedLength) acts.knockedStartedAt = null;
  const shoving = acts.shoveStartedAt !== null && lengths.shove !== undefined;
  const reeling = acts.knockedStartedAt !== null;

  let hopBurst: number | null = null;
  if (signals.hop !== null && signals.hop !== acts.lastHop) {
    acts.hopStartedAt = now;
    hopBurst = signals.hop;
  }
  acts.lastHop = signals.hop;
  const hopElapsed = elapsedSince(acts.hopStartedAt, now);
  if (lengths.hop === undefined || hopElapsed >= lengths.hop) acts.hopStartedAt = null;
  const hopping = acts.hopStartedAt !== null;

  // Sent on (a trap where the dash ended): the landing is over, not to be played again after.
  if (moving) acts.landStartedAt = null;
  const arriving = current?.motion === "run" && current.arriving;
  acts.runLinger = moving ? (arriving ? 0 : RUN_LINGER_SECONDS) : Math.max(0, acts.runLinger - delta);
  // Slowing onto the walk's last tile (with a brake clip): it stops there, no run lingers after.
  const braking = moving && arriving && !levitating && lengths.brake !== undefined;

  if (signals.verdict !== null && signals.verdict !== acts.lastVerdict) {
    acts.lastVerdict = signals.verdict;
    acts.reaction = { startedAt: now, clips: VERDICT_CLIPS.filter((name) => lengths[name] !== undefined) };
  }
  const outburst = signals.outburst;
  if (outburst !== null && outburst.id !== acts.lastOutburst) {
    acts.lastOutburst = outburst.id;
    if (lengths[outburst.clip] !== undefined) acts.reaction = { startedAt: now, clips: [outburst.clip] };
  }
  let reactClip: CharacterClip | null = null;
  if (acts.reaction !== null) {
    const step = sequenceStep(acts.reaction.clips, lengths, now - acts.reaction.startedAt);
    if (step.kind === "over") {
      // The last pose has held its moment: they face the path again.
      acts.reaction = null;
      heading = headingOf(input.path) ?? heading;
    } else reactClip = step.clip;
  }
  if (acts.reaction !== null && input.faceToward) {
    const [tx, , tz] = input.faceToward;
    const [px, , pz] = input.position;
    heading = headingOf([tx - px, 0, tz - pz]) ?? heading;
  }

  // Sheathed as soon as the figure runs off (a roll can cut the cast short).
  const bladesOut = castClip !== undefined && castElapsed < castClip && !moving;
  const propHeld =
    castClip !== undefined &&
    castElapsed >= traits.castPropSeconds &&
    castElapsed < (traits.castImpactSeconds ?? castClip) &&
    !moving;
  const wandOut = casting && !moving;

  const resting = input.canRest && signals.isResting && !levitating && !moving && !casting && !reeling && !gone;
  // With a sit clip they sit down once the brake is over, and the chair grows in as they do.
  if (!resting) acts.sitStartedAt = null;
  else acts.sitStartedAt ??= lengths.sit === undefined ? -Infinity : now;
  const sitElapsed = acts.sitStartedAt === null ? -1 : now - acts.sitStartedAt;
  const sitting = lengths.sit !== undefined && sitElapsed >= 0 && sitElapsed < lengths.sit;
  const seated = resting && sitElapsed >= (lengths.sit ?? 0) * CHAIR_AT;

  // Onto a wall's tile: one jump over it, played through even as the walk goes on.
  if (signals.overWall && !acts.onWall && lengths.vault !== undefined) acts.vaultStartedAt = now;
  acts.onWall = signals.overWall;
  if (acts.vaultStartedAt !== null && now - acts.vaultStartedAt >= (lengths.vault ?? 0)) acts.vaultStartedAt = null;
  const vaulting = acts.vaultStartedAt !== null;
  const limping = signals.limping && moving && lengths.limp !== undefined;
  // The Convergence: sits down into the lotus once, then holds it while floating.
  if (!signals.meditating) acts.meditateStartedAt = null;
  else acts.meditateStartedAt ??= now;
  const meditateElapsed = elapsedSince(acts.meditateStartedAt, now);
  const lotus =
    signals.meditating && lengths.lotus !== undefined
      ? meditateElapsed < (lengths.meditate ?? 0)
        ? "meditate"
        : "lotus"
      : null;

  let clip: CharacterClip;
  if (reeling && lengths.knocked !== undefined) clip = "knocked";
  else if (vaulting) clip = "vault";
  else if (limping) clip = "limp";
  else if (hopping && !motion.travelling) clip = "hop";
  else if (shoving && !moving) clip = "shove";
  else if (launching) clip = "dash";
  else if (landed && !moving) clip = "land";
  else if (reactClip !== null && !moving) clip = reactClip;
  else if (braking) clip = "brake";
  // Landing on its chair it sits at once: the run's linger would carry it running through the chair.
  else if (lotus === "lotus" && moving) clip = "lotus";
  else if (moving || (acts.runLinger > 0 && !seated)) clip = levitating ? "float" : "run";
  else if (sitting) clip = "sit";
  else if (casting && castClip !== undefined && !traits.castsStill) clip = "cast";
  else if (lotus !== null) clip = lotus;
  else clip = levitating ? "float" : seated ? "rest" : "idle";

  return {
    clip,
    heading,
    turn: clip === "cast" ? traits.castTurn : 0,
    hidden,
    gone,
    sunk,
    // Rising into a levitation is show enough.
    spin: casting && castClip === undefined && !levitating && traits.spinsToCast ? castProgress : 0,
    lunge:
      lengths.shove === undefined && shoveElapsed < LUNGE_SECONDS
        ? Math.sin((Math.PI * shoveElapsed) / LUNGE_SECONDS) * LUNGE_DISTANCE
        : 0,
    reel:
      reeling && lengths.knocked === undefined && current?.motion === "leap" ? Math.sin(Math.PI * current.progress) : 0,
    seated,
    crackling,
    bladesOut,
    propHeld,
    wandOut,
    landingAt,
    shoveAt,
    hopBurst,
  };
}

/** Under once the hand sinks, gone while carried off, then out of hell's tile; returns how far under (0–1). */
function stepDrag(acts: TokenActs, dragged: TokenSignals["dragged"], now: number, settled: boolean): number {
  if (dragged?.phase === "sink" && acts.drag?.id !== dragged.id)
    acts.drag = { stage: "sinking", since: now, id: dragged.id };
  const drag = acts.drag;
  if (!drag) return 0;
  const elapsed = now - drag.since;
  switch (drag.stage) {
    case "sinking":
      if (elapsed >= SINK_SECONDS) acts.drag = { ...drag, stage: "gone", since: now };
      return Math.min(1, elapsed / SINK_SECONDS) ** 2;
    case "gone":
      if (dragged?.phase !== "sink" && settled) acts.drag = { ...drag, stage: "emerging", since: now };
      return 1;
    case "emerging":
      if (elapsed >= EMERGE_SECONDS) acts.drag = null;
      return 1 - easeInOut(Math.min(1, elapsed / EMERGE_SECONDS));
  }
}

function elapsedSince(startedAt: number | null, now: number): number {
  return startedAt === null ? Infinity : now - startedAt;
}

function negate([x, y, z]: Vec3): Vec3 {
  return [-x, -y, -z];
}
