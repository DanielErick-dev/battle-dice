"use client";

import { Color } from "three";
import { Drift } from "./particles/Drift";
import { LightShafts } from "./particles/LightShafts";

const EMBER_COLOR = new Color(3.2, 0.9, 0.2);
const MOTE_COLOR = new Color(2.2, 1.9, 1.2);

/** Embers rising from the lava, or motes of light and sunbeams, around the whole arena. */
export function RealmParticles({ radius }: { radius: number }) {
  return (
    <>
      <Drift
        realm="infernal"
        count={900}
        radius={radius}
        floor={-1}
        ceiling={14}
        color={EMBER_COLOR}
        size={1.6}
        rise={1.4}
        sway={0.5}
        flicker={1}
        seed={7}
      />
      <Drift
        realm="celestial"
        count={600}
        radius={radius}
        floor={-0.5}
        ceiling={18}
        color={MOTE_COLOR}
        size={1.3}
        rise={0.35}
        sway={0.9}
        flicker={0.3}
        seed={13}
      />
      <LightShafts radius={radius * 0.6} />
    </>
  );
}
