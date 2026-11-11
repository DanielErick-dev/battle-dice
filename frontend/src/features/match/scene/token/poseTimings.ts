import type { CharacterClip } from "@/features/characters";
import { DEFAULT_TIMINGS } from "@/features/shared/config";

/** The figure throws itself forward (its dash clip) before the bolt takes it out of sight. */
export const DASH_VANISH_SECONDS = DEFAULT_TIMINGS.dashLaunchMs / 1000 + 0.1;
/** Out of a land clip's impact, how long the lightning keeps trailing the limbs. */
export const LAND_CRACKLE_SECONDS = 0.4;
/** So brief stops between tiles don't flicker out of the run cycle. */
export const RUN_LINGER_SECONDS = 0.18;
/** Using an ability without a cast clip: a leap with a full spin. */
export const HOP_SECONDS = 0.7;
/** A cast clip's last pose is held this long before settling into idle. */
export const CAST_HOLD_SECONDS = 0.5;
/** Themis's verdict: she guards against the attack, points at the one judged, then scoffs as it turns on them. */
export const VERDICT_CLIPS: readonly CharacterClip[] = ["guard", "cast", "scoff"];
/** Share of a sit clip gone when the chair starts growing in: they turn to it first, then sit. */
export const CHAIR_AT = 0.15;
/** Hell's Drag: dragged under, then climbing back out in hell. */
export const SINK_SECONDS = DEFAULT_TIMINGS.dragSinkMs / 1000;
export const EMERGE_SECONDS = 0.7;
