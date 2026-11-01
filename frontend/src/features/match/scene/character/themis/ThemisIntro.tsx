"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Euler,
  Quaternion,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type Object3D,
  type Sprite,
  type SpriteMaterial,
} from "three";
import type { IntroSwordBeats } from "../../../characters";
import { useAge } from "../../useAge";
import { useBone } from "../core/bones";
import { InHand } from "../core/inHand";
import { preloadProps, Prop, usePropMesh } from "../core/props";
import { placeInWorld } from "../core/worldPlacement";
import { AdditiveMaterial } from "../shared/additive";
import { clamp01, easeOutCubic, smoothstep } from "../shared/easing";
import { useGlowColor } from "../shared/glowColor";
import { useSoftDisc } from "../shared/softDisc";
import { fanDirections, LightRays, starDirections, useRayParts } from "./greekLight";
import { SWORD_LEAN, SWORD_LENGTH, SwordGrip } from "./JusticeSword";

/** Meshy figures stand this tall in their own units (the sword's length is given in them). */
const MODEL_HEIGHT = 1.7;
/** Share of the blade driven into the ground. */
const SINK = 0.14;
/** The golden ring rippling out over the floor where the sword strikes, and again where it tears free. */
const RIPPLE_SECONDS = 0.8;
const RIPPLE_RADIUS = 0.55;
/** Radians the planted sword shakes by at most, just before it tears free. */
const TREMBLE = 0.07;
/** How high it lifts out of the ground (shares of its length) before flying to her hand. */
const LIFT = 0.25;
const GOLD = "#f5c45a";
/** Greek light: warm white rays fanning up where the sword strikes, and a star of it in her hand as she calls it. */
const LIGHT = "#fff0c4";
const BURST_SECONDS = 1.3;
const BURST_RAYS = fanDirections(14, 0.12, 1.15);
const STAR_RAYS = starDirections(9);
/** Seconds after the strike her hand starts to glow, and how long it takes to fill. */
const HAND_GLOW_DELAY = 0.35;
const HAND_GLOW_SECONDS = 0.6;
const ORB_LOOK = { transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false, opacity: 0 };
const UP = new Vector3(0, 1, 0);

preloadProps(["justiceSword"]);

/**
 * Themis's intro, `beats` in the clip's own time (played at `speed`): kneeling, she drives her sword into the
 * ground, where it stays planted with a golden ripple and a burst of rays of light; as she rises and gestures,
 * light gathers in her hand and the sword trembles on a thread of it, harder and harder,
 * tears itself out of the ground and flies back into her fist (the stage keeps the held one out of her hand
 * meanwhile, see JusticeSword's `away`). Mounted fresh with every intro.
 */
export function ThemisIntro({
  figure,
  size,
  beats,
  speed = 1,
}: {
  figure: Object3D;
  size: number;
  beats: IntroSwordBeats;
  speed?: number;
}) {
  const age = useAge();
  const hand = useBone(figure, "RightHand");
  const root = useRef<Group>(null);
  const flying = useRef<Group>(null);
  const grip = useRef<Group>(null);
  const ripple = useRef<Mesh>(null);
  const rippleMaterial = useRef<MeshBasicMaterial>(null);
  const spot = useRef<Vector3 | null>(null);
  const glow = useGlowColor(GOLD, 2);
  const sword = usePropMesh("justiceSword");
  const light = useGlowColor(LIGHT, 2.4);
  const burstRays = useRayParts(light);
  const starRays = useRayParts(light);
  const threadRays = useRayParts(light);
  const disc = useSoftDisc();
  const burst = useRef<Group>(null);
  const burstEach = useRef<(Group | null)[]>([]);
  const star = useRef<Group>(null);
  const starEach = useRef<(Group | null)[]>([]);
  const orb = useRef<Sprite>(null);
  const orbMaterial = useRef<SpriteMaterial>(null);
  const thread = useRef<Group>(null);
  const scratch = useMemo(
    () => ({
      hand: new Vector3(),
      at: new Vector3(),
      from: new Vector3(),
      gripAt: new Vector3(),
      gripScale: new Vector3(),
      turn: new Quaternion(),
      gripTurn: new Quaternion(),
      shake: new Quaternion(),
      euler: new Euler(),
      lean: new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), SWORD_LEAN),
      flat: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2),
      hilt: new Vector3(),
      span: new Vector3(),
      spin: new Quaternion(),
      none: new Quaternion(),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const group = root.current;
    const blade = flying.current;
    if (!group || !blade || !hand) return;
    // In the clip's own time, so the beats stay on the animation whatever its speed.
    const t = age(clock.elapsedTime) * speed;
    const struck = t - beats.plantSeconds;
    // Where the blade meets the ground: under her fist at the strike (the figure's origin is at its feet).
    if (struck >= 0 && !spot.current) {
      hand.getWorldPosition(scratch.hand);
      spot.current = new Vector3(scratch.hand.x, group.getWorldPosition(scratch.at).y, scratch.hand.z);
    }
    const out = spot.current !== null && t < beats.catchSeconds;
    blade.visible = out;
    if (spot.current && out) {
      const length = (size * SWORD_LENGTH) / MODEL_HEIGHT;
      // Planted, shaking harder and harder until it tears free, then lifting out of the ground.
      const tremble = clamp01((t - beats.trembleSeconds) / (beats.riseSeconds - beats.trembleSeconds));
      const flight = clamp01((t - beats.riseSeconds) / (beats.catchSeconds - beats.riseSeconds));
      const lift = smoothstep(clamp01(flight * 3)) * LIFT;
      const shake = TREMBLE * tremble ** 2 * (1 - flight);
      scratch.euler.set(Math.sin(t * 61) * shake, 0, Math.sin(t * 47 + 1) * shake);
      scratch.shake.setFromEuler(scratch.euler);
      scratch.from.copy(spot.current).addScaledVector(UP, length * (0.5 - SINK + lift));
      figure.getWorldQuaternion(scratch.turn).multiply(scratch.lean).multiply(scratch.shake);
      // Then it flies to where it sits in her fist, turning to the grip on the way.
      const home = smoothstep(clamp01((flight - 0.3) / 0.7));
      let worldLength = length;
      if (home > 0 && grip.current) {
        grip.current.getWorldPosition(scratch.gripAt);
        grip.current.getWorldQuaternion(scratch.gripTurn);
        const gripLength = grip.current.getWorldScale(scratch.gripScale).x * SWORD_LENGTH;
        scratch.from.lerp(scratch.gripAt, home);
        scratch.turn.slerp(scratch.gripTurn, home);
        worldLength = length + (gripLength - length) * home;
      }
      placeInWorld(blade, group, scratch.from, worldLength, scratch.turn);
    }

    // Rays of light bursting up out of the ground at the strike.
    const burstAge = clamp01(struck / BURST_SECONDS);
    if (burst.current) {
      burst.current.visible = spot.current !== null && struck >= 0 && burstAge < 1;
      if (spot.current && burst.current.visible) {
        placeInWorld(burst.current, group, spot.current, 1, scratch.none);
        const reach = size * easeOutCubic(clamp01(burstAge * 3));
        burstEach.current.forEach((ray, index) =>
          ray?.scale.set(size * 0.07, reach * (0.55 + ((index * 5) % 7) * 0.08), 1),
        );
      }
      burstRays.material.setValues({ opacity: burstAge > 0 && burstAge < 1 ? (1 - burstAge) ** 1.5 : 0 });
    }

    // Light gathered in her hand while the sword is in the ground, brightest as she calls it out.
    const tremble = clamp01((t - beats.trembleSeconds) / (beats.riseSeconds - beats.trembleSeconds));
    const fill = smoothstep(clamp01((struck - HAND_GLOW_DELAY) / HAND_GLOW_SECONDS));
    const glowing = fill * (0.75 + 0.25 * tremble) * (1 - clamp01((t - beats.catchSeconds) / 0.3));
    hand.getWorldPosition(scratch.hand);
    if (star.current) {
      star.current.visible = glowing > 0.01;
      if (star.current.visible) {
        scratch.euler.set(t * 0.9, t * 0.6, 0);
        placeInWorld(star.current, group, scratch.hand, 1, scratch.spin.setFromEuler(scratch.euler));
        starEach.current.forEach((ray, index) => {
          const flicker = 0.75 + 0.25 * Math.sin(t * 9 + index * 1.7);
          ray?.scale.set(size * 0.03, size * (0.1 + 0.08 * tremble) * flicker * glowing, 1);
        });
      }
      starRays.material.setValues({ opacity: glowing });
    }
    if (orb.current && orbMaterial.current) {
      orb.current.visible = glowing > 0.01;
      if (orb.current.visible) placeInWorld(orb.current, group, scratch.hand, size * 0.14 * (0.8 + 0.4 * glowing));
      orbMaterial.current.opacity = glowing;
    }
    // A thread of light from her hand to the hilt while she pulls the sword free.
    const pulling = spot.current !== null ? tremble * (1 - clamp01((t - beats.riseSeconds) / 0.25)) : 0;
    if (thread.current) {
      thread.current.visible = pulling > 0.01;
      if (spot.current && thread.current.visible) {
        const length = (size * SWORD_LENGTH) / MODEL_HEIGHT;
        scratch.hilt.copy(spot.current).addScaledVector(UP, length * (1 - SINK));
        scratch.span.subVectors(scratch.hilt, scratch.hand);
        const reach = scratch.span.length();
        scratch.spin.setFromUnitVectors(UP, scratch.span.normalize());
        placeInWorld(thread.current, group, scratch.hand, 1, scratch.spin);
        thread.current.children[0]?.scale.set(size * 0.025, reach, 1);
      }
      threadRays.material.setValues({ opacity: pulling * (0.7 + 0.3 * Math.sin(t * 23)) });
    }

    // A ripple where it strikes, and another as it tears free.
    const sinceRise = t - beats.riseSeconds;
    const wave = sinceRise >= 0 ? sinceRise : struck;
    const spread = clamp01(wave / RIPPLE_SECONDS);
    if (ripple.current && rippleMaterial.current) {
      ripple.current.visible = spot.current !== null && wave >= 0 && spread < 1;
      if (spot.current && ripple.current.visible) {
        scratch.at.copy(spot.current).addScaledVector(UP, 0.01);
        placeInWorld(ripple.current, group, scratch.at, size * RIPPLE_RADIUS * easeOutCubic(spread), scratch.flat);
      }
      rippleMaterial.current.opacity = 1 - spread;
    }
  });

  return (
    <>
      <group ref={root}>
        <group ref={flying} visible={false}>
          <Prop geometry={sword.geometry} material={sword.material} height={1} />
        </group>
        <LightRays ref={burst} directions={BURST_RAYS} {...burstRays} rays={burstEach} />
        <LightRays ref={star} directions={STAR_RAYS} {...starRays} rays={starEach} />
        <sprite ref={orb} visible={false}>
          <spriteMaterial ref={orbMaterial} map={disc} color={light} {...ORB_LOOK} />
        </sprite>
        <group ref={thread} visible={false}>
          <group>
            <mesh geometry={threadRays.geometry} material={threadRays.material} />
            <mesh geometry={threadRays.geometry} material={threadRays.material} rotation-y={Math.PI / 2} />
          </group>
        </group>
        <mesh ref={ripple} visible={false}>
          <ringGeometry args={[0.75, 1, 48]} />
          <AdditiveMaterial ref={rippleMaterial} color={glow} />
        </mesh>
      </group>
      {/* Where the sword sits in her fist, for it to fly back to. */}
      <InHand figure={figure} bone="RightHand">
        {(bone) => (
          <SwordGrip figure={figure} hand={bone}>
            <group ref={grip} />
          </SwordGrip>
        )}
      </InHand>
    </>
  );
}
