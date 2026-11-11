"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import { Color, Fog, type AmbientLight, type HemisphereLight, type PointLight } from "three";
import type { RealmKind } from "@/game/domain/types";
import { HEMI_GROUND, HEMI_SKY, SKY } from "./mix/palette";
import { blendRealm, stepRealmMix, type RealmMix } from "./mix/realmMix";
import { RealmMixContext } from "./mix/useRealmMix";

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
    stepRealmMix(current, realm, delta);

    const { color } = scratch.current;
    blendRealm(color, SKY.mortal.horizon, SKY.infernal.horizon, SKY.celestial.horizon, current);
    if (scene.background instanceof Color) scene.background.copy(color);
    if (scene.fog instanceof Fog) scene.fog.color.copy(color);

    if (hemisphere.current) {
      blendRealm(hemisphere.current.color, HEMI_SKY.mortal, HEMI_SKY.infernal, HEMI_SKY.celestial, current);
      blendRealm(
        hemisphere.current.groundColor,
        HEMI_GROUND.mortal,
        HEMI_GROUND.infernal,
        HEMI_GROUND.celestial,
        current,
      );
      hemisphere.current.intensity = 0.75 + current.infernal * 0.25 + current.celestial * 0.35;
    }
    if (ambient.current) ambient.current.intensity = 0.36 + current.celestial * 0.16;
    if (lavaLight.current) lavaLight.current.intensity = current.infernal * 60;
  });

  return (
    <RealmMixContext.Provider value={mix}>
      <ambientLight ref={ambient} intensity={0.36} />
      <hemisphereLight ref={hemisphere} args={["#6c7c96", "#0b0a0e", 0.75]} />
      {/* Hellfire from below: lights the underside of the arena and the infernal track. */}
      <pointLight ref={lavaLight} position={[0, -3, 0]} color="#ff4a12" intensity={0} distance={60} decay={1.4} />
      {children}
    </RealmMixContext.Provider>
  );
}
