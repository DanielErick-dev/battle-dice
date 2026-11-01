"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Color, DoubleSide, type Group } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { useDisposal } from "./dispose";
import { grassTuft, scatterAround } from "./geometry";
import { useRefList } from "./refs";

export interface TuftLook {
  seed: number;
  /** Blade colour at the root and at the tip. */
  root: string;
  tip: string;
  /** How many tuft shapes to make, blades in each and how tall. */
  variants: number;
  blades: number;
  height: number;
  /** How many tufts, scattered on the ring between `inner` and `outer`. */
  count: number;
  inner: number;
  outer: number;
  /** Tufts are `size[0]` to `size[0] + size[1]` times their shape. */
  size: readonly [min: number, spread: number];
  roughness: number;
  /** Each tuft draws its own phase for `sway`. */
  phased: boolean;
}

export interface Tuft {
  x: number;
  z: number;
  variant: number;
  size: number;
  turn: number;
  phase: number;
}

/** Bends a tuft over (its z rotation, about its foot) at time `t`. */
export type Sway = (t: number, tuft: Tuft, index: number) => number;

/** Tufts of grass round the figure, each a few strap-like blades; they bend when given a `sway`. */
export function GrassTufts({ look, sway }: { look: TuftLook; sway?: Sway }) {
  const { variants, tufts } = useMemo(() => {
    const random = seededRandom(look.seed);
    const root = new Color(look.root);
    const tip = new Color(look.tip);
    const variants = Array.from({ length: look.variants }, () =>
      grassTuft(random, look.blades, look.height, root, tip),
    );
    const tufts = scatterAround(random, look.count, look.inner, look.outer).map(([x, z], index): Tuft => ({
      x,
      z,
      variant: index % variants.length,
      size: look.size[0] + random() * look.size[1],
      turn: random() * Math.PI * 2,
      phase: look.phased ? random() * Math.PI * 2 : 0,
    }));
    return { variants, tufts };
  }, [look]);
  useDisposal(variants);
  const [groups, bind] = useRefList<Group>();

  useFrame(({ clock }) => {
    if (!sway) return;
    const t = clock.elapsedTime;
    tufts.forEach((tuft, index) => {
      const group = groups.current[index];
      if (group) group.rotation.z = sway(t, tuft, index);
    });
  });

  return (
    <>
      {tufts.map(({ x, z, variant, size, turn }, index) => (
        <group key={index} ref={bind(index)} position={[x, 0, z]}>
          <mesh geometry={variants[variant]} rotation-y={turn} scale={size}>
            <meshStandardMaterial vertexColors side={DoubleSide} roughness={look.roughness} />
          </mesh>
        </group>
      ))}
    </>
  );
}
