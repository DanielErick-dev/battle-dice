"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Vector3, type Group, type Object3D, type Sprite } from "three";
import { handUnit, InHand } from "../core/inHand";
import { useSoftDisc } from "../shared/softDisc";
import { useAge } from "../../useAge";
import { FlameCard } from "./FlameCard";

/** Seconds before the release the fireball starts gathering in his hand. */
const GATHER_SECONDS = 1.1;

/**
 * His pitch's fireball: it gathers in his right hand through the wind-up and is gone at `releaseSeconds` (the
 * thrown one takes over, see FireBolt), a flash of fire bursting off his fingers as it leaves (see SnapFlare).
 */
export function HandFireball({ figure, releaseSeconds }: { figure: Object3D; releaseSeconds: number }) {
  return (
    <InHand figure={figure} bone="RightHand">
      {(hand) => <Ball hand={hand} figure={figure} releaseSeconds={releaseSeconds} />}
    </InHand>
  );
}

function Ball({ hand, figure, releaseSeconds }: { hand: Object3D; figure: Object3D; releaseSeconds: number }) {
  const disc = useSoftDisc();
  const root = useRef<Group>(null);
  const halo = useRef<Sprite>(null);
  const scratch = useMemo(() => ({ hand: new Vector3(), figure: new Vector3() }), []);
  const age = useAge();

  useFrame(({ clock }) => {
    const node = root.current;
    if (!node) return;
    const t = age(clock.elapsedTime);
    const grown = Math.min(1, Math.max(0, (t - (releaseSeconds - GATHER_SECONDS)) / GATHER_SECONDS));
    node.visible = grown > 0 && t < releaseSeconds;
    if (!node.visible) return;
    const unit = handUnit(hand, figure, scratch);
    node.scale.setScalar(unit * (0.3 + 0.7 * grown) * (1 + Math.sin(clock.elapsedTime * 31) * 0.06));
    node.position.set(-0.04, 0.08, 0).multiplyScalar(unit);
    if (halo.current) halo.current.material.opacity = 0.5 + 0.4 * grown;
  });

  return (
    <group ref={root} visible={false}>
      <sprite ref={halo} scale={0.45}>
        <spriteMaterial map={disc} color="#ff6a1a" transparent depthWrite={false} blending={AdditiveBlending} />
      </sprite>
      <sprite scale={0.16}>
        <spriteMaterial map={disc} color="#fff1c2" transparent depthWrite={false} blending={AdditiveBlending} />
      </sprite>
      <FlameCard width={0.2} position={[0, -0.06, 0]} glow={1.6} seed={7} />
    </group>
  );
}
