"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Sprite, SpriteMaterial } from "three";
import { flameScale, flicker, type FlameShape, type Flicker } from "./motion";

/** A flame or its haze, a sprite whose size flickers; the phases keep it out of step with its neighbours. */
export function FlickerSprite({
  material,
  look,
  shape,
  phases = [0, 0],
  position,
  renderOrder = 0,
}: {
  material: SpriteMaterial;
  look: Flicker;
  shape: FlameShape;
  /** Of the slow and the quick wave. */
  phases?: readonly [number, number];
  position?: readonly [number, number, number];
  renderOrder?: number;
}) {
  const sprite = useRef<Sprite>(null);
  useFrame(({ clock }) => {
    sprite.current?.scale.set(...flameScale(shape, flicker(clock.elapsedTime, look, ...phases)));
  });
  return <sprite ref={sprite} material={material} position={position} renderOrder={renderOrder} />;
}
