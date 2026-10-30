"use client";

import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useSoftDisc } from "./matchAssets";
import { circlingAt, wave, type Circling } from "./motion";
import { useRefList } from "./refs";

/** A soft patch of mist lying on the ground, slowly circling the stage and breathing in size. */
export interface MistPatch extends Circling {
  size: number;
  height: number;
  /** Sets its breath apart from its neighbours'. */
  phase: number;
}

export interface MistLook {
  colour: string;
  opacity: number;
  renderOrder: number;
  /** Radians a second of the patches' breathing. */
  breath: number;
}

/** Patches of mist creeping round the figure's feet (cold mist, graveyard shadows, fog). */
export function GroundMist({ patches, look }: { patches: readonly MistPatch[]; look: MistLook }) {
  const disc = useSoftDisc();
  const [groups, bind] = useRefList<Group>();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    patches.forEach((patch, index) => {
      const group = groups.current[index];
      if (!group) return;
      const [x, z] = circlingAt(patch, t);
      group.position.set(x, patch.height, z);
      group.scale.setScalar(patch.size * (1 + wave(t, 0.12, look.breath, patch.phase)));
    });
  });

  return (
    <>
      {patches.map((_, index) => (
        <group key={index} ref={bind(index)}>
          <mesh rotation-x={-Math.PI / 2} renderOrder={look.renderOrder}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={disc} color={look.colour} opacity={look.opacity} transparent depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}
