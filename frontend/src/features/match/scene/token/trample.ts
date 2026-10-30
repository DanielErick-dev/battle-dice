import { DEFAULT_TIMINGS } from "../../config";

/** Without a shove clip: a lunge this far forward and back, over this long. */
export const LUNGE_DISTANCE = 0.45;
export const LUNGE_SECONDS = 0.5;
/** When the one sent flying comes down on its new tile (the flight's leap, roughly). */
export const KNOCKED_LANDING_SECONDS = DEFAULT_TIMINGS.trampleFlightMs / 1000 - 0.1;
