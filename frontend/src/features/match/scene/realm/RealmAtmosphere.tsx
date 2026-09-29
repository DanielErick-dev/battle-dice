"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { createContext, useContext, useRef, type ReactNode, type RefObject } from "react";
import { Color, Fog, type AmbientLight, type HemisphereLight, type PointLight } from "three";
import type { RealmKind } from "@/game/domain/types";

/**
 * How much of each realm the world shows right now, 0–1 each (both 0 = the night sea).
 * Eased every frame, read every frame: shaders and lights blend from it without re-rendering.
 */
export interface RealmMix {
  infernal: number;
  celestial: number;
}

const RealmMixContext = createContext<RefObject<RealmMix> | null>(null);

export function useRealmMix(): RefObject<RealmMix> {
  const mix = useContext(RealmMixContext);
  if (!mix) throw new Error("useRealmMix needs a <RealmAtmosphere> above it");
  return mix;
}

/** Sky colours per world; the fog and background follow the horizon. */
export const SKY = {
  mortal: { horizon: new Color("#1b1236"), zenith: new Color("#03040b") },
  infernal: { horizon: new Color("#5a1206"), zenith: new Color("#120203") },
  celestial: { horizon: new Color("#c9a47c"), zenith: new Color("#2f4f9e") },
} as const;

/** Blends three colours by the mix into `target`. */
export function blendRealm(target: Color, mortal: Color, infernal: Color, celestial: Color, mix: RealmMix): Color {
  return target.copy(mortal).lerp(infernal, mix.infernal).lerp(celestial, mix.celestial);
}

/** Seconds for a full crossfade between worlds. */
const CROSSFADE_SECONDS = 1.6;

interface RealmAtmosphereProps {
  /** The world the camera's player is in; null for the night sea. */
  realm: RealmKind | null;
  children: ReactNode;
}

/**
 * Eases the realm mix towards the current realm and repaints what isn't a shader of its own:
 * background, fog and the scene's fill lights (red glow rising from the lava, warm daylight).
 */
export function RealmAtmosphere({ realm, children }: RealmAtmosphereProps) {
  const mix = useRef<RealmMix>({ infernal: 0, celestial: 0 });
  const scene = useThree((state) => state.scene);
  const hemisphere = useRef<HemisphereLight>(null);
  const ambient = useRef<AmbientLight>(null);
  const lavaLight = useRef<PointLight>(null);
  const scratch = useRef({ color: new Color() });

  useFrame((_, delta) => {
    const current = mix.current;
    const step = Math.min(1, delta / CROSSFADE_SECONDS) * 2.2;
    current.infernal += ((realm === "infernal" ? 1 : 0) - current.infernal) * step;
    current.celestial += ((realm === "celestial" ? 1 : 0) - current.celestial) * step;

    const { color } = scratch.current;
    blendRealm(color, SKY.mortal.horizon, SKY.infernal.horizon, SKY.celestial.horizon, current);
    if (scene.background instanceof Color) scene.background.copy(color);
    if (scene.fog instanceof Fog) scene.fog.color.copy(color);

    if (hemisphere.current) {
      blendRealm(hemisphere.current.color, HEMI_SKY.mortal, HEMI_SKY.infernal, HEMI_SKY.celestial, current);
      blendRealm(hemisphere.current.groundColor, HEMI_GROUND.mortal, HEMI_GROUND.infernal, HEMI_GROUND.celestial, current);
      hemisphere.current.intensity = 0.5 + current.infernal * 0.25 + current.celestial * 0.35;
    }
    if (ambient.current) ambient.current.intensity = 0.3 + current.celestial * 0.1;
    if (lavaLight.current) lavaLight.current.intensity = current.infernal * 60;
  });

  return (
    <RealmMixContext.Provider value={mix}>
      <ambientLight ref={ambient} intensity={0.3} />
      <hemisphereLight ref={hemisphere} args={["#8fa3ff", "#1b0b22", 0.5]} />
      {/* Hellfire from below: lights the underside of the arena and the infernal track. */}
      <pointLight ref={lavaLight} position={[0, -3, 0]} color="#ff4a12" intensity={0} distance={60} decay={1.4} />
      {children}
    </RealmMixContext.Provider>
  );
}

const HEMI_SKY = { mortal: new Color("#8fa3ff"), infernal: new Color("#ff6a3a"), celestial: new Color("#fff1d0") };
const HEMI_GROUND = { mortal: new Color("#1b0b22"), infernal: new Color("#3a0802"), celestial: new Color("#4a5a8a") };
