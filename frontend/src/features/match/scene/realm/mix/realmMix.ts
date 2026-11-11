import type { Color } from "three";
import type { RealmKind } from "@/game/domain/types";

/**
 * How much of each realm the world shows right now, 0–1 each (both 0 = the night sea).
 * Eased every frame, read every frame: shaders and lights blend from it without re-rendering.
 */
export interface RealmMix {
  infernal: number;
  celestial: number;
}

/** Seconds for a full crossfade between worlds. */
const CROSSFADE_SECONDS = 1.6;

/** Eases `mix` in place, `delta` seconds towards `realm` (null for the night sea). */
export function stepRealmMix(mix: RealmMix, realm: RealmKind | null, delta: number): void {
  const step = Math.min(1, delta / CROSSFADE_SECONDS) * 2.2;
  mix.infernal += ((realm === "infernal" ? 1 : 0) - mix.infernal) * step;
  mix.celestial += ((realm === "celestial" ? 1 : 0) - mix.celestial) * step;
}

/** Blends three colours by the mix into `target`. */
export function blendRealm(target: Color, mortal: Color, infernal: Color, celestial: Color, mix: RealmMix): Color {
  return target.copy(mortal).lerp(infernal, mix.infernal).lerp(celestial, mix.celestial);
}
