"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import { Vector3, type DirectionalLight } from "three";

const SHADOW_MAP = 2048;
/** The moon's direction (per unit of board scale) from the point its shadows centre on. */
const MOON_OFFSET = new Vector3(7, 14, 8);
/** The shadowed square's half-size per unit of camera distance: enough to cover what's on screen. */
const SHADOW_REACH = 0.85;
/** Its size only changes in steps this big, so the shadow camera isn't rebuilt every frame. */
const EXTENT_STEP = 2;

const ground = new Vector3();
const look = new Vector3();

/**
 * The match's moonlight: one key light casting shadows, and a cool rim light.
 * The shadows only cover the ground around what the camera looks at (a small square follows it), so
 * the shadow pass skips everything off screen and the shadows come out sharper.
 */
export function SceneLights({ scale, shadowExtent }: { scale: number; shadowExtent: number }) {
  const moon = useRef<DirectionalLight>(null);
  const extent = useRef(0);
  const scene = useThree((state) => state.scene);

  // The light aims at its target object, which must be in the scene to follow it.
  useLayoutEffect(() => {
    const target = moon.current?.target;
    if (!target) return;
    scene.add(target);
    return () => void scene.remove(target);
  }, [scene]);

  useFrame(({ camera }) => {
    const light = moon.current;
    if (!light) return;
    // Where the camera's line of sight meets the ground (or a point in front of it when looking level).
    camera.getWorldDirection(look);
    const down = look.y < -0.05 ? -camera.position.y / look.y : 20 * scale;
    ground.copy(camera.position).addScaledVector(look, down).setY(0);
    const distance = camera.position.distanceTo(ground);

    const wanted = Math.min(shadowExtent, Math.max(8 * scale, distance * SHADOW_REACH));
    const stepped = Math.ceil(wanted / EXTENT_STEP) * EXTENT_STEP;
    const shadowCamera = light.shadow.camera;
    if (stepped !== extent.current) {
      extent.current = stepped;
      shadowCamera.left = shadowCamera.bottom = -stepped;
      shadowCamera.right = shadowCamera.top = stepped;
      shadowCamera.updateProjectionMatrix();
    }
    // Moved a whole shadow texel at a time: sliding smoothly makes the shadow edges crawl.
    const texel = (2 * stepped) / SHADOW_MAP;
    ground.set(Math.round(ground.x / texel) * texel, 0, Math.round(ground.z / texel) * texel);
    light.target.position.copy(ground);
    light.position.copy(ground).addScaledVector(MOON_OFFSET, scale);
  });

  return (
    <>
      {/* Cold moonlight; warmth comes only from fires, torches and lanterns. */}
      <directionalLight
        ref={moon}
        position={[7 * scale, 14 * scale, 8 * scale]}
        intensity={2}
        color="#c6d1e6"
        castShadow
        shadow-mapSize={[SHADOW_MAP, SHADOW_MAP]}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-far={60 * scale}
      />
      {/* Cool rim light from the moon's side of the sky. */}
      <directionalLight position={[-0.3, 0.28, -0.8]} intensity={0.7} color="#8da0c2" />
    </>
  );
}
