"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { SpriteMaterial, Vector3, type Group, type Object3D, type Sprite } from "three";
import { useAge } from "../useAge";
import { useSoftDisc } from "./softDisc";
import { findBone, placeInWorld } from "./worldPlacement";

/** Seconds between puffs, how long one drifts, and how many soft blobs make one up. */
const BREATH_EVERY = 1.1;
const BREATH_SECONDS = 1.6;
const PUFF_BLOBS = 5;
/** Puffs drifting at once. */
const PUFF_SLOTS = Math.ceil(BREATH_SECONDS / BREATH_EVERY) + 1;
/** Per second: how fast the breath fades in and out with `active`. */
const FADE_RATE = 2;

const scratch = {
  head: new Vector3(),
  muzzle: new Vector3(),
  forward: new Vector3(),
  lift: new Vector3(),
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Cold breath steaming from the figure's mouth in regular puffs, out the way its face points and
 * rising as they go. Meshy rigs carry a joint at the front of the face (`headfront`): on a long
 * muzzle, the breath comes from there. `heavyAt` (seconds after mounting) makes the puff then a
 * heavier one, as after a blow; `active` (on by default) fades it in and out. `size` is the
 * figure's height in world units.
 */
export function ColdBreath({
  figure,
  size,
  heavyAt,
  active,
}: {
  figure: Object3D;
  size: number;
  heavyAt?: number;
  active?: RefObject<boolean>;
}) {
  const root = useRef<Group>(null);
  const puffs = useRef<(Sprite | null)[]>([]);
  const head = useMemo(() => findBone(figure, "Head"), [figure]);
  const muzzle = useMemo(() => findBone(figure, "headfront"), [figure]);
  const disc = useSoftDisc();
  // Each blob fades on its own, so each gets its own material.
  const materials = useMemo(
    () =>
      Array.from(
        { length: PUFF_SLOTS * PUFF_BLOBS },
        () =>
          new SpriteMaterial({
            map: disc,
            color: "#d4ebff",
            transparent: true,
            depthWrite: false,
          }),
      ),
    [disc],
  );
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);
  const age = useAge();
  const presence = useRef(active ? 0 : 1);

  useFrame(({ clock }, delta) => {
    const group = root.current;
    if (!group || !head) return;
    const t = age(clock.elapsedTime);
    if (active) presence.current += ((active.current ? 1 : 0) - presence.current) * Math.min(1, delta * FADE_RATE);
    head.getWorldPosition(scratch.head);
    muzzle?.getWorldPosition(scratch.muzzle);
    scratch.forward.subVectors(scratch.muzzle, scratch.head).setY(0);
    // Level with the floor; straight down (or without the joint), the way the body faces.
    if (muzzle && scratch.forward.lengthSq() > 1e-6) {
      scratch.forward.normalize();
    } else {
      figure.getWorldDirection(scratch.forward);
      scratch.muzzle.copy(scratch.head).addScaledVector(scratch.forward, 0.1 * size);
    }
    const latest = Math.floor(t / BREATH_EVERY);
    for (let back = 0; back < PUFF_SLOTS; back++) {
      const puff = latest - back;
      const start = puff * BREATH_EVERY;
      const life = (t - start) / BREATH_SECONDS;
      const heavy = heavyAt !== undefined && start >= heavyAt && start < heavyAt + BREATH_EVERY ? 1.7 : 1;
      const slot = ((puff % PUFF_SLOTS) + PUFF_SLOTS) % PUFF_SLOTS;
      for (let blob = 0; blob < PUFF_BLOBS; blob++) {
        const index = slot * PUFF_BLOBS + blob;
        const piece = puffs.current[index];
        if (!piece) continue;
        const drift = clamp01(life - blob * 0.05);
        piece.visible = puff >= 0 && drift > 0 && drift < 1 && presence.current > 0.01;
        if (!piece.visible) continue;
        // Blown out fast, slowing as it spreads.
        const reach = 1 - (1 - drift) ** 2;
        scratch.lift
          .copy(scratch.muzzle)
          .addScaledVector(scratch.forward, (0.02 + reach * 0.2 * heavy + blob * 0.015) * size);
        scratch.lift.y += (-0.015 + drift * 0.07) * size;
        placeInWorld(piece, group, scratch.lift, size * (0.03 + drift * 0.13 * heavy));
        materials[index].setValues({
          opacity: 0.6 * Math.sin(drift * Math.PI) * (1 - blob * 0.12) * presence.current,
        });
      }
    }
  });

  return (
    <group ref={root}>
      {materials.map((material, index) => (
        <sprite
          key={index}
          ref={(sprite) => {
            puffs.current[index] = sprite;
          }}
          material={material}
          visible={false}
        />
      ))}
    </group>
  );
}
