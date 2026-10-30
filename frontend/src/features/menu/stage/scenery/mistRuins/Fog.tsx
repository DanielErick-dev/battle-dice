"use client";

import { useFrame } from "@react-three/fiber";
import type { Sprite } from "three";
import { GroundMist, type MistLook, type MistPatch } from "../kit/GroundMist";
import { useSoftDisc } from "../kit/matchAssets";
import { useRefList } from "../kit/refs";

const PATCHES: MistPatch[] = Array.from({ length: 12 }, (_, index) => ({
  radius: 0.3 + ((index * 0.41) % 0.6),
  angle: index * 2.4,
  speed: 0.035 * (index % 2 ? 1 : -1),
  size: 0.6 + (index % 4) * 0.16,
  height: 0.01 + (index % 4) * 0.03,
  phase: index,
}));
const PATCH_LOOK: MistLook = { colour: "#a9c4e4", opacity: 0.13, renderOrder: 3, breath: 0.45 };
/** Taller banks of fog along the back. */
const BANKS = Array.from({ length: 5 }, (_, index) => ({
  x: -0.8 + index * 0.4,
  z: -0.75 + (index % 2) * 0.15,
  size: 0.8 + (index % 3) * 0.2,
}));

/** Low fog creeping over the paving, and the taller banks drifting behind. */
export function Fog() {
  const disc = useSoftDisc();
  const [banks, bind] = useRefList<Sprite>();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // The banks drift sideways and back, never leaving the back arc.
    BANKS.forEach(({ x, z, size }, index) => {
      const bank = banks.current[index];
      if (!bank) return;
      bank.position.set(x + Math.sin(t * 0.12 + index * 1.9) * 0.12, 0.14, z);
      bank.scale.set(size * 1.4, size * 0.45, 1);
    });
  });

  return (
    <>
      <GroundMist patches={PATCHES} look={PATCH_LOOK} />
      {BANKS.map((_, index) => (
        <sprite key={index} ref={bind(index)} renderOrder={3}>
          <spriteMaterial map={disc} color="#8fa9cc" opacity={0.16} transparent depthWrite={false} />
        </sprite>
      ))}
    </>
  );
}
