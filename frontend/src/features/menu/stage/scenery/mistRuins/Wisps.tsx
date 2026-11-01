"use client";

import { useFrame } from "@react-three/fiber";
import type { Sprite, SpriteMaterial } from "three";
import { useRefList } from "../kit/refs";

/** Each wisp wanders its own loop: centre, reach and height. */
const WISPS = [
  { x: -0.55, z: -0.55, reach: 0.22, height: 0.75, speed: 0.35 },
  { x: 0.45, z: -0.6, reach: 0.25, height: 0.45, speed: -0.28 },
  { x: 0.05, z: -0.85, reach: 0.3, height: 1.05, speed: 0.22 },
  { x: -0.75, z: 0.05, reach: 0.15, height: 0.3, speed: -0.4 },
];
/** Sprites in each wisp's tail, its head first. */
export const TRAIL = 5;

/** Pale lights wandering between the stones, each trailing a fading tail along the loop it follows. */
export function Wisps({ trail, aura }: { trail: SpriteMaterial[]; aura: SpriteMaterial }) {
  const [sprites, bindSprite] = useRefList<Sprite>();
  const [auras, bindAura] = useRefList<Sprite>();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    WISPS.forEach(({ x, z, reach, height, speed }, wisp) => {
      const place = (sprite: Sprite | null, at: number) => {
        if (!sprite) return;
        const angle = at * speed * 3 + wisp * 2;
        sprite.position.set(
          x + Math.cos(angle) * reach,
          height + Math.sin(at * 1.1 + wisp) * 0.08,
          z + Math.sin(angle * 2) * reach * 0.4,
        );
      };
      // Fades in and out on its own slow breath, so they never all show at once.
      const breath = 0.5 + 0.5 * Math.sin(t * 0.5 + wisp * 1.7);
      for (let segment = 0; segment < TRAIL; segment++) {
        const sprite = sprites.current[wisp * TRAIL + segment];
        place(sprite, t - segment * 0.09);
        sprite?.scale.setScalar((0.07 - segment * 0.01) * (0.4 + breath));
      }
      const glow = auras.current[wisp];
      place(glow, t);
      glow?.scale.setScalar(0.45 * (0.3 + breath));
    });
  });

  return (
    <>
      {WISPS.map((_, wisp) => (
        <group key={wisp}>
          <sprite material={aura} ref={bindAura(wisp)} />
          {trail.map((material, segment) => (
            <sprite key={segment} material={material} ref={bindSprite(wisp * TRAIL + segment)} />
          ))}
        </group>
      ))}
    </>
  );
}
